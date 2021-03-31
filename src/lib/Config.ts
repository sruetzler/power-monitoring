import EventEmitter = require("events");
import { readFile, watch } from "fs";
import * as _ from "lodash"

export interface DeviceConfig {
    topic : string;
    mode : "learning"|"monitoring";
    minCurrent : number;
    timeout : number;
    number : string;
    message : string;
}

export interface UserConfig {
    name : string;
    devices : DeviceConfig;
}

export interface MqttConfig {
    user : string;
    password : string;
    port : number;
    host : string;       
}

interface ConfigData {
    mqtt : MqttConfig;
    users : {[userId:string]:UserConfig};
}

export interface Config {
    on(event: 'mqtt', listener: (config: MqttConfig) => void): this;
    on(event: 'users', listener: (users:string[]) => void): this;
    on(event: 'devices', listener: (userId:string, devices: string[]) => void): this;
    on(event: 'device', listener: (userId:string, device:string, config: DeviceConfig) => void): this;
    get(type: "mqtt" ):MqttConfig;
    get(type: "users" ):string[];
    get(type: "devices", userId : string  ):string[];
    get(type: "device", userId : string, device: string  ):DeviceConfig;
}


class ConfigClass extends EventEmitter implements Config{
    private config:ConfigData;
    constructor(){
        super();
    }
    async open(){
        this.config = await this.readConfig();
        watch("./config.json", (event, _filename)=>{
            if (event === "change") this.onFileChanged();
        });
    }
    private async readConfig():Promise<ConfigData>{
        return await new Promise((resolve, reject)=>{
            readFile("./config.json", "utf8", function (err, data){
                if (err) return reject(err);
                try{
                    resolve(JSON.parse(data));
                }catch(err){
                    reject(err);
                }
            });
        });
    }
    private async onFileChanged(){
        const oldConfig = this.config;
        this.config = await this.readConfig();
        this.compareMqtt(oldConfig);
        this.compareUsers(oldConfig);
    }
    private compareMqtt(oldConfig:ConfigData){
        if (!_.isEqual(this.config.mqtt, oldConfig.mqtt)) this.emit("mqtt", this.config.mqtt);
    }
    private compareUsers(oldConfig:ConfigData){
        const oldUsers = Object.keys(oldConfig.users);
        const users = Object.keys(this.config.users);
        if (!_.isEqual(users, oldUsers)) this.emit("user", users);
        users.forEach(this.compareDevices(oldConfig));
    }
    private compareDevices(oldConfig:ConfigData){return (user:string)=>{
        const oldDevices = Object.keys(oldConfig.users[user]?.devices);
        const devices = Object.keys(this.config.users[user]?.devices);
        if (oldDevices && !_.isEqual(devices, oldDevices)) this.emit("devices", user, devices);
        devices.forEach(this.compareDevice(oldConfig, user));
    }}
    private compareDevice(oldConfig:ConfigData,user:string){return (device:string)=>{
        const oldDeviceConfig = oldConfig.users[user]?.devices[device];
        const deviceConfig = this.config.users[user]?.devices[device];
        if (oldDeviceConfig && !_.isEqual(deviceConfig, oldDeviceConfig)) this.emit("device", user, device, deviceConfig);
    }}
    private getMqtt(): MqttConfig{
        return this.config.mqtt;
    }
    private getUser(userId: string): UserConfig{
        return this.config.users && this.config.users[userId];
    }
    private getDevice(userId: string, device: string): DeviceConfig{
        return this.config.users && this.config.users[userId] &&
            this.config.users[userId].devices && this.config.users[userId].devices[device];
    }
    get(type: any, userId?: any, device?: any):any {
        if ( type === "mqtt") return this.getMqtt();
        if ( type === "user") return this.getUser(userId);
        if ( type === "device") return this.getDevice(userId, device);
    }
}

export async function getConfig():Promise<Config>{
    const config = new ConfigClass();
    config.open();
    return config;
}