import { ImageConversion } from './ImageConversion';
export class ImageProfile {
    id: string;
    label: string;
    descr: string;
    tpath: string;
    deleteOriginal: boolean;
    conversions: Array <ImageConversion> = [];
}
