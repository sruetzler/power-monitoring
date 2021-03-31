import { Config } from "./Config";
import Device from "./Device";
import Mqtt from "./Mqtt";

export default class User{
    private devices : {[device:string]:Device} = {};
    constructor(private userId:string, private config:Config, private mqtt:Mqtt){
        console.log("new user", userId);
        const devices = this.config.get("devices",this.userId);
        devices.forEach(device=>{
            this.devices[device] = new Device(userId, device, this.config, this.mqtt);
        });
        this.config.on("devices", (userId, devices)=>{
            if (userId !== this.userId) return;
            this.onDevicesChanged(devices);
        });
    }
    close(){
        console.log("delete user", this.userId);
        Object.keys(this.devices).forEach(device=>this.devices[device].close());
    }
    private onDevicesChanged(devices:string[]){
        const oldDevices = this.devices;
        devices.forEach(device=>{
            if (oldDevices[device]) delete oldDevices[device];
            else this.devices[device] = new Device(this.userId, device, this.config, this.mqtt);
        });
        Object.keys(oldDevices).forEach(device=>{
            this.devices[device].close();
            delete this.devices[device];
        });
    }
}