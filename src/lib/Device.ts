import { stringify } from "querystring"
import { Config, DeviceConfig } from "./Config";
import Mqtt from "./Mqtt";
import Switch from "./Switch";
import modeFactory from "./modeFactory";
import { IMode } from "./definition";

export default class Device{
    private config:DeviceConfig;
    private switch:Switch;
    private mode:IMode;
    constructor(private userId:string, private device:string, private configClass:Config, private mqtt:Mqtt){
        console.log("new device", device);
        this.config = configClass.get("device", this.userId, this.device);
        configClass.on("device", async (userId, device, config)=>{
            if (userId !== this.userId || device !== this.device) return;
            await this.onConfigChanged(config);
        });
    }
    async open(){
        this.switch = new Switch(this.mqtt, this.userId, this.config.topic, this.configClass);
        await this.switch.open();
        this.mode = await modeFactory(this.config, this.switch, this.configClass, this.userId, this.device);
    }
    async delete(){
        console.log("delete device", this.device);
        if (this.mode) await this.mode.delete();
        if (this.switch) await this.switch.delete();
    }
    async close(){
        console.log("close device", this.device);
        await this.mode.close();
        await this.switch.close();
    }
    private async onConfigChanged(config:DeviceConfig){
        if (this.config.mode !== config.mode){
            this.config = config;
            if (this.mode) await this.mode.delete;
            this.mode = await modeFactory(this.config, this.switch,this.configClass, this.userId, this.device);
        }
    }
}