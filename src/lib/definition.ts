
export type Mode = "learning"|"monitoring";

export interface IMode {
    delete():Promise<void>;
    close():Promise<void>;
};