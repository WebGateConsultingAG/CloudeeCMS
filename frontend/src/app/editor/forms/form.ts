export class Form {
    id: string;
    title: string;
    otype: string;
    okey: string;
    custFields: Array<any> = [];
    body: string;
    descr: string;
    staticcaptcha: string;
    redirectFailure: string;
    redirectSuccess: string;
    notify: string;
    lstEmail: any;

    sqsQueueURL: string;
    mailFrom: string;
    mailSubject: string;
    mailBody: string;
}
