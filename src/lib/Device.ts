import { stringify } from "querystring"
import { Config, DeviceConfig } from "./Config";
import Mqtt from "./Mqtt";

export default class Device{
    private config:DeviceConfig
    constructor(private userId:string, private device:string, config:Config, private mqtt:Mqtt){
        console.log("new device", device);
        this.config = config.get("device", this.userId, this.device);
        config.on("device", (userId, device, config)=>{
            if (userId !== this.userId || device !== this.device) return;
            this.onConfigChanged(config);
        });
    }
    private onConfigChanged(config:DeviceConfig){

    }
    close(){
        console.log("delete device", this.device);

    }
}