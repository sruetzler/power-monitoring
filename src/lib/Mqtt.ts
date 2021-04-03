import { Config, MqttConfig } from "./Config";
import * as mqtt from "mqtt";

export type SubscriptionCallback =  (topic:string, message:string)=>void;
export type Subscription = { cb:SubscriptionCallback, id:number};

export default class Mqtt{
    private config:MqttConfig
    private client:mqtt.Client;
    private subscriptions:{[topic:string]:Subscription[]} = {};
    private subscriptionId = 0;
    constructor(config:Config){
        this.config = config.get("mqtt");
        config.on("mqtt", (config)=>{
            this.onConfigChanged(config);
        });
    }
    private init(){
        this.client  = mqtt.connect(`mqtts://${this.config.host}:${this.config.port}`,{ 
            reconnectPeriod : 1000,
            username : this.config.user,
            password : this.config.password,
        });
        this.client.on('connect', ()=>{
            this.client.subscribe('#', (err)=>{
                if (err) console.error(err);
            });
        });     
        this.client.on('message', (topic, message)=>{
            for (let t in this.subscriptions){
                if (topic.startsWith(t)){
                    this.subscriptions[topic].forEach(subscription=>{
                        try{
                            subscription.cb(topic,message.toString());
                        }catch(err){}
                    });
                }
            }
        });       
       
    }
    private onConfigChanged(config:MqttConfig){
        this.client.end();
        this.init();
    }
    async open(){
        this.init();
    }
    async close(){
        this.client.end();
    }
    publish (topic:string, message:string){
        this.client.publish(topic,message);
    }
    subscribe(topic:string, cb:SubscriptionCallback):number{
        if (!this.subscriptions[topic]) this.subscriptions[topic] = [];
        const id = this.subscriptionId++
        this.subscriptions[topic].push({cb,id});
        return id;
    }
    unsubscribe(id:number){
        for (let topic in this.subscriptions){
            this.subscriptions[topic] = this.subscriptions[topic].filter(subsription=>subsription.id !== id);
            if (this.subscriptions[topic].length === 0) delete this.subscriptions[topic];
        }
    }
}