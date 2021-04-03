import { IMode } from "lib/definition";
import Switch from "lib/Switch";
import { DeviceConfig, Config, MonitoringModeData } from "lib/Config";
import { toPlainObject } from "lodash";
import { clear } from "console";
import { get } from "https";

export default class Monitoring implements IMode{
    private data:MonitoringModeData;
    private timeout:NodeJS.Timeout;
    private offTimeout:NodeJS.Timeout;
    constructor(private _switch:Switch,private config:DeviceConfig, private configClass:Config, private userId:string, private device:string){
        this.getData();
        this._switch.on("state", async (state:boolean)=>{
            await this.onState(state);
        });
        this._switch.on("current", async (current:number)=>{
            await this.onCurrent(current);
        });
    }
    private getData(){
        this.data = this.config.modeData as MonitoringModeData;
        if (this.data?.type === "monitoring") return;
        this.initData();
    }
    private initData(){
        this.data = {
            type : "monitoring",
            lastStartMin : 0,
            state : "off",
        }
    }
    async open(){
        await this.init();
        await this.onState(this._switch.getState());
        await this.onCurrent(this._switch.getCurrent());
    }
    async init(){
        if (this.data.lastStartMin){
            const past = (new Date()).getTime() - this.data.lastStartMin;
            this.startOffTimeout(past);
            if (this.data.state === "monitoring") this.setCheckReady(past);
        }
        console.log(this.data.state)
    }
    async delete(){
        await close();
    }
    async close(){
        clearTimeout(this.timeout);
        clearTimeout(this.offTimeout);
    }
    private async saveData(){
        await this.configClass.saveModeData(this.userId, this.device, this.data);
    }
    private async onState(state:boolean){
        if (state){
            if (this.data.state === "off") this.toOn();
        }else{
            if (this.data.state !== "off") this.toWaiting();
        }
        await this.saveData();
    }
    private async onCurrent(current:number){
        let changed = false
        if (current > this.config.minCurrent){
            if (this.data.state === "waiting") changed = this.toMonitoring() || changed;
            if (this.data.state === "monitoring") changed = this.resetCheckReady() || changed;
            changed = this.stopOffTimeout() || changed;
        }else{
            if (this.data.state === "monitoring") changed = this.setCheckReady() || changed;
            changed = this.startOffTimeout() || changed;
        }
        if (changed) await this.saveData();
    }
    private toOn(){
        console.log("on")
        this.data.lastStartMin = 0;
        this.data.state = "on";
        this.startOffTimeout();
    }
    private startOffTimeout(past?:number):boolean{
        if (this.offTimeout) return false;
        if (!past) past = 0;
        this.data.lastStartMin = (new Date()).getTime();
        clearTimeout(this.offTimeout);
        this.offTimeout = setTimeout(async ()=>{
            this.toOff();
            await this.saveData();
        },(30 * 60 * 1000) - past);  
        this.offTimeout.unref();
        return true;
    }
    private stopOffTimeout():boolean{
        if (!this.offTimeout) return false;
        this.data.lastStartMin = 0;
        clearTimeout(this.offTimeout);
        delete this.offTimeout;
        return true;
    }
    private toWaiting(){
        console.log("waiting")
        this.data.state = "waiting";
        clearTimeout(this.timeout);
        this.timeout = setTimeout(async ()=>{
            this.toOn();
            await this.saveData();
        },15 * 60 * 1000);
        this._switch.switch(true);
    }
    private toMonitoring():boolean{
        console.log("monitoring")
        this.data.state = "monitoring";
        this.data.lastStartMin = 0;
        clearTimeout(this.timeout);
        return true;
    }
    private toOff(){
        console.log("off")
        this.data.lastStartMin = 0;
        this.data.state = "off";
        this._switch.switch(false);
    }
    private toReady(){
        console.log("ready")
        this.data.state = "ready";
        console.log("ring ring");
        this.call();
    }
    private setCheckReady(past?:number):boolean{
        if (this.data.lastStartMin && !past) return false;
        if (!past) past = 0;
        console.log("checkReady")
        this.timeout = setTimeout(async ()=>{
            this.toReady();
            await this.saveData();
        }, (this.config.timeout * 1000) - past);
        this.timeout.unref();
    }
    private resetCheckReady():boolean{
        if (!this.data.lastStartMin) return false;
        console.log("not checkReady")
        this.data.lastStartMin = 0;
        clearTimeout(this.timeout);
    }
    private call(){
        const authorization = `basic ${this.configClass.get("voice").apiKey}`;
        const path = `/api/voice?to=${this.config.number}&text=${this.config.message}`;
        get({
            host : "gateway.sms77.io",
            path : encodeURI(path),
            headers : {
                authorization
            }
        });
    }
}
//export type MonitoringState = "off"|"on"|"waiting"|"monitoring"|"ready";

