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
        configClass.on("device", (userId, device, config)=>{
            if (userId !== this.userId || device !== this.device) return;
            this.onConfigChanged(config);
        });
    }
    async open(){
        this.switch = new Switch(this.mqtt, this.config.topic);
        await this.switch.open();
        this.mode = await modeFactory(this.config, this.switch, this.configClass, this.userId, this.device);
    }
    async delete(){
        console.log("delete device", this.device);
        await this.mode.delete();
        await this.switch.delete();
    }
    async close(){
        console.log("close device", this.device);
        await this.mode.close();
        await this.switch.close();
    }
    private onConfigChanged(config:DeviceConfig){

    }
}