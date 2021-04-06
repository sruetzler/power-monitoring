import EventEmitter = require("events");
import Mqtt from "./Mqtt";

type State = "ON"|"OFF";

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
    private teleoPeriodTopic:string;
    private stateSubscription: number;
    private sensorSubscription: number;
    constructor(private mqtt:Mqtt, topic:string){
        super();
        this.stateTopicCmd = `cmnd/${topic}/POWER`;
        this.stateTopic = `stat/${topic}/POWER`;
        this.sensorTopic = `tele/${topic}/SENSOR`;
        this.teleoPeriodTopic = `cmnd/${topic}/TelePeriod`;

        this.subscribeState();
        this.subscribeSensor();
    }
    async open(){
    }
    async delete(){
        await this.close();
    }
    async close(){
        this.mqtt.unsubscribe(this.stateSubscription);
        this.mqtt.unsubscribe(this.sensorSubscription);
    }
    private subscribeState(){
        this.stateSubscription = this.mqtt.subscribe(this.stateTopic, (_topic, message:State)=>{
            const state = message==="ON";
            if (this.state !== state){
                this.state = state;
                const telePeriod = this.state?10:300;
                this.mqtt.publish(this.teleoPeriodTopic, telePeriod.toString());
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