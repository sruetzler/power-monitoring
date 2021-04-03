import { Config } from "./Config";
import Device from "./Device";
import Mqtt from "./Mqtt";

export default class User{
    private devices : {[device:string]:Device} = {};
    constructor(private userId:string, private config:Config, private mqtt:Mqtt){
        console.log("new user", userId);
    }
    async open(){
        const devices = this.config.get("devices",this.userId);
        for (let i=0; i<devices.length; i++){
            const device = devices[i];
            this.devices[device] = new Device(this.userId, device, this.config, this.mqtt);
            await this.devices[device].open();
        }
        this.config.on("devices", (userId, devices)=>{
            if (userId !== this.userId) return;
            this.onDevicesChanged(devices);
        });
    }
    async delete(){
        console.log("delete user", this.userId);
        for (let device in this.devices) await this.devices[device].delete();
    }
    async close(){
        console.log("close user", this.userId);
        for (let device in this.devices) await this.devices[device].close();
    }
    private async onDevicesChanged(devices:string[]){
        const oldDevices = Object.keys(this.devices).reduce((devices,device)=>{
            devices[device]=true;
            return devices;
        },{});
        for (let i=0; i<devices.length; i++){
            const device = devices[i];
            if (oldDevices[device]) delete oldDevices[device];
            else{
                this.devices[device] = new Device(this.userId, device, this.config, this.mqtt);
                await this.devices[devices[i]].open();
            }
        }
        Object.keys(oldDevices).forEach(device=>{
            this.devices[device].delete();
            delete this.devices[device];
        });
    }
}