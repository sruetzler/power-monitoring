
export type Mode = "learning"|"monitoring";

export interface IMode {
    delete():Promise<void>;
    close():Promise<void>;
};

export function formatDate(date:Date, humanReadable?:boolean):string{
    const year = fixLength('' + date.getUTCFullYear());
    const month = fixLength('' + (date.getUTCMonth() + 1));
    const day = fixLength('' + date.getUTCDate());
    const hour = fixLength('' + date.getUTCHours());
    const minute = fixLength('' + date.getUTCMinutes());
    const second = fixLength('' + date.getUTCSeconds());

    if (humanReadable) return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
    else return `${year}${month}${day}${hour}${minute}${second}`;
}

function fixLength(value:string){
    if (value.length < 2) 
    value = '0' + value;
    return value;
}
