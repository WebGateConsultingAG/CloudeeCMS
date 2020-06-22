export class Page {
    id: string;
    title: string;
    otype: string;
    descr: string;
    opath: string;
    layout: string;
    body: string;
    lstMTObj: any = {};
    doc: any = {};
    queue: string;
    categories: any = [];
    dt: Date;
    sitemap: boolean;
    ftindex: boolean;
    listnav: boolean;
    keywords: string;
    navlabel: string;
    img: string;
}
