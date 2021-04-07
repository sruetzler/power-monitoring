import EventEmitter = require("events");
import { readFile, watch, FSWatcher, writeFile } from "fs-extra";
import * as _ from "lodash"
import { Mode } from "./definition";

export interface LearningModeData {
    type : "learning";
    learning : boolean;
    startTime : number;
    fileName : string;
}

export type MonitoringState = "off"|"on"|"waiting"|"monitoring"|"ready";

export interface MonitoringModeData {
    type : "monitoring";
    lastStartMin : number;
    state : MonitoringState;
}

export interface DeviceConfig {
    ipAddress : string,
    topic : string;
    mode : Mode;
    minCurrent : number;
    timeout : number;
    number : string;
    message : string;
    modeData : LearningModeData|MonitoringModeData;
}

export interface UserConfig {
    name : string;
    devices : DeviceConfig[];
}

export interface MqttConfig {
    user : string;
    password : string;
    port : number;
    host : string;       
}

export interface VoiceConfig {
    apiKey : string;
}

interface ConfigData {
    mqtt : MqttConfig;
    voice : VoiceConfig;
    users : {[userId:string]:UserConfig};
}

export interface Config {
    saveModeData(userId: string, device: string, data: LearningModeData|MonitoringModeData);
    saveIpAddress(userId: string, device: string, ipAddress: string);
    on(event: 'mqtt', listener: (config: MqttConfig) => void): this;
    on(event: 'voice', listener: (config: VoiceConfig) => void): this;
    on(event: 'users', listener: (users:string[]) => void): this;
    on(event: 'devices', listener: (userId:string, devices: string[]) => void): this;
    on(event: 'device', listener: (userId:string, device:string, config: DeviceConfig) => void): this;
    get(type: "mqtt" ):MqttConfig;
    get(type: "voice" ):VoiceConfig;
    get(type: "users" ):string[];
    get(type: "devices", userId : string  ):string[];
    get(type: "device", userId : string, device: string  ):DeviceConfig;
    close():Promise<void>;
}


class ConfigClass extends EventEmitter implements Config{
    private config:ConfigData;
    watcher: FSWatcher;
    constructor(){
        super();
    }
    async open(){
        this.config = await this.readConfig();
        this.watcher = watch("./config.json", (event, _filename)=>{
            if (event === "change") this.onFileChanged();
        });
    }
    async close(){
        this.watcher.close();
    }
    private async readConfig():Promise<ConfigData>{
        const data = await readFile("./config.json", "utf8");
        return JSON.parse(data);
    }
    private async onFileChanged(){
        try{
            const oldConfig = this.config;
            this.config = await this.readConfig();
            this.compareMqtt(oldConfig);
            this.compareVoice(oldConfig);
            this.compareUsers(oldConfig);
        }catch(err){}
    }
    private compareMqtt(oldConfig:ConfigData){
        if (!_.isEqual(this.config.mqtt, oldConfig.mqtt)) this.emit("mqtt", this.config.mqtt);
    }
    private compareVoice(oldConfig:ConfigData){
        if (!_.isEqual(this.config.voice, oldConfig.voice)) this.emit("voice", this.config.voice);
    }
    private compareUsers(oldConfig:ConfigData){
        const oldUsers = Object.keys(oldConfig.users);
        const users = Object.keys(this.config.users);
        if (!_.isEqual(users, oldUsers)) this.emit("users", users);
        users.forEach(this.compareDevices(oldConfig));
    }
    private compareDevices(oldConfig:ConfigData){return (userId:string)=>{
        const oldDevices = getDevices(oldConfig,userId);
        const devices = getDevices(this.config,userId);
        if (oldDevices && !_.isEqual(devices, oldDevices)) this.emit("devices", userId, devices);
        devices.forEach(this.compareDevice(oldConfig, userId));
    }}
    private compareDevice(oldConfig:ConfigData,userId:string){return (device:string)=>{
        const oldDeviceConfig = getDevice(oldConfig, userId, device);
        const deviceConfig = getDevice(this.config, userId, device);
        if (oldDeviceConfig && !_.isEqual(deviceConfig, oldDeviceConfig)) this.emit("device", userId, device, deviceConfig);
    }}
    private getMqtt(): MqttConfig{
        return this.config.mqtt;
    }
    private getVoice(): VoiceConfig{
        return this.config.voice;
    }
    private getUsers(): string[]{
        return Object.keys(this.config.users);
    }
    get(type: any, userId?: any, device?: any):any {
        if ( type === "mqtt") return this.getMqtt();
        if ( type === "voice") return this.getVoice();
        if ( type === "users") return this.getUsers();
        if ( type === "devices") return getDevices(this.config,userId);
        if ( type === "device") return getDevice(this.config,userId, device);
    }
    async saveModeData(userId: string, device: string, data: LearningModeData|MonitoringModeData) {
        const devices = this.config.users[userId].devices
        for (let i=0; i<devices.length; i++){
            if (devices[i].topic === device) this.config.users[userId].devices[i].modeData = data;
        }
        await writeFile("./config.json", JSON.stringify(this.config, null, 2), "utf8");
    }
    async saveIpAddress(userId: string, device: string, ipAddress: string) {
        const devices = this.config.users[userId].devices
        for (let i=0; i<devices.length; i++){
            if (devices[i].topic === device) this.config.users[userId].devices[i].ipAddress = ipAddress;
        }
        await writeFile("./config.json", JSON.stringify(this.config, null, 2), "utf8");
    }
}

function getDevices(config:ConfigData, userId: string): string[]{
    if (config.users && config.users[userId] &&
        config.users[userId].devices){
        return config.users[userId].devices.map(e=>e.topic);
    }
    return [];
}
function getDevice(config:ConfigData, userId: string, device: string): DeviceConfig{
    if (config.users && config.users[userId] &&
        config.users[userId].devices){
        return config.users[userId].devices.reduce<DeviceConfig>((found, deviceConfig)=>{
            if (!found && deviceConfig.topic === device) found = deviceConfig;
            return found;
        },null);
    };
}

export async function getConfig():Promise<Config>{
    const config = new ConfigClass();
    await config.open();
    return config;
}