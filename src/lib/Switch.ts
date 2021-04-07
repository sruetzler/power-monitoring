import EventEmitter = require("events");
import { Config } from "./Config";
import Mqtt from "./Mqtt";

type State = "ON"|"OFF";

type Result = {
    [request:string] :string
}

export interface ISwitch {
    on(event: 'current', listener: (current: number) => void): this;
    on(event: 'state', listener: (state:boolean) => void): this;
}


export default class Switch extends EventEmitter implements ISwitch{
    private state:boolean;
    private current:number;
    private stateTopicCmd:string;
    private stateTopic:string;
    private sensorTopic:string;
    private telePeriodTopic:string;
    private resultTopic:string;
    private ipAddressTopic:string;
    private stateSubscription: number;
    private sensorSubscription: number;
    constructor(private mqtt:Mqtt, private userId: string, private topic:string, private configClass:Config){
        super();
        this.stateTopicCmd = `cmnd/${topic}/POWER`;
        this.stateTopic = `stat/${topic}/POWER`;
        this.sensorTopic = `tele/${topic}/SENSOR`;
        this.telePeriodTopic = `cmnd/${topic}/TelePeriod`;
        this.resultTopic = `stat/${topic}/RESULT`;
        this.ipAddressTopic = `cmnd/${topic}/IPAddress1`;

        this.subscribeState();
        this.subscribeSensor();
    }
    async open(){
        this.getIpAddress();
    }
    async delete(){
        await this.close();
    }
    async close(){
        this.mqtt.unsubscribe(this.stateSubscription);
        this.mqtt.unsubscribe(this.sensorSubscription);
    }
    private async getIpAddress(){
        this.mqtt.subscribe(this.resultTopic, (_topic, message:string)=>{
            const result = JSON.parse(message) as Result;
            if (!result.IPAddress1) return;
            const data = result.IPAddress1;
            const e = data.split(" ");
            let ipAddress = e[0];
            if (ipAddress === "0.0.0.0" && e.length > 1) ipAddress = e[1].replace(/^\(/,"").replace(/\)$/,"");
            this.configClass.saveIpAddress(this.userId, this.topic, ipAddress);
        });
        this.mqtt.publish(this.ipAddressTopic,"");
    }
    private subscribeState(){
        this.stateSubscription = this.mqtt.subscribe(this.stateTopic, (_topic, message:State)=>{
            const state = message==="ON";
            if (this.state !== state){
                this.state = state;
                const telePeriod = this.state?10:300;
                this.mqtt.publish(this.telePeriodTopic, telePeriod.toString());
//                console.log("state", this.state);
                this.emit("state", this.state);
            }
        });
        this.mqtt.publish(this.stateTopicCmd,"");
    }
    private subscribeSensor(){
        this.sensorSubscription = this.mqtt.subscribe(this.sensorTopic, (_topic, message)=>{
            const data = JSON.parse(message);
            const current = data?.ENERGY?.Current;
            if (this.current !== current){
                this.current = current;
//                console.log("current", this.current);
                this.emit("current", this.current);
            }
        });
    }
    switch(state:boolean){
        this.mqtt.publish(this.stateTopicCmd,state?"ON":"OFF");
    }
    getState():boolean{
        return this.state;
    }
    getCurrent():number{
        return this.current;
    }
}