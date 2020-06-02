/*
 * Copyright WebGate Consulting AG, 2020
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
 * implied. See the License for the specific language governing
 * permissions and limitations under the License.
 *
 */

import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { versioninfo } from '../version';

@Component({
    selector: 'app-about-dialog',
    templateUrl: 'AboutDialog.html',
    styleUrls: ['AboutDialog.css']
})

export class AboutDialogComponent implements OnInit {
    constructor(
        public dialogRef: MatDialogRef<Component>
    ) { }

    APP_VERSION = versioninfo.version;
    cssAlt1: boolean;
    cssAlt2: boolean;

    matrix = [];
    nmatrix = [];
    matrix2d = [];
    px = [];
    sintable = [];
    costable = [];
    Xan: number;
    Yan: number;
    Zan: number;
    offsetLeft = 0;
    offsetTop = 0;
    maxW = 800;
    maxH = 600;
    flxTimeline = 0;
    flx3dBGmodT = .4;
    flx3dBGmodL = .4;

    ngOnInit() {
        const that = this;
        setTimeout(() => { that.cssAlt1 = true; }, 500);
        setTimeout(() => { that.cssAlt2 = true; }, 2000);
    }
    btnCancel(): void {
        this.flxTimeline = -1;
        this.dialogRef.close(null);
    }

    init3d() {
        // 3d anim by flexion
        if (this.flxTimeline > 0) { return; }
        this.maxH = window.innerHeight;
        this.maxW = window.innerWidth;
        this.loadWGCLogo(); // load logo to get point count
        for (let i = 0; i < this.nmatrix.length; i++) { this.matrix[i] = this.nmatrix[i]; } // activate loaded object
        this.loadFieldObject();
        this.Xan = 60;
        this.Yan = 10;
        this.Zan = 20;
        for (let angle = 0; angle < 2200; angle++) {
            this.sintable[angle] = Math.sin(angle / 100.0 * Math.PI);
            this.costable[angle] = 0 - Math.cos(angle / 110.1 * Math.PI);
        }
        let htout = '';
        // tslint:disable-next-line: max-line-length
        for (let i = 0; i < this.matrix.length; i++) { htout += '<div id=\'pt' + i + '\' style=\'position: absolute; left: 100px; top: 100px; z-index: 99999;\'>.</div>'; }
        document.getElementById('flx3d').innerHTML = htout;
        for (let i = 0; i < this.matrix.length; i++) { this.px[i] = document.getElementById('pt' + i); }
        this.playerLoop();
    }

    playerLoop() {
        if (this.flxTimeline < 0) { return; }
        this.flxTimeline += 1;
        // if (this.flxTimeline % 20 === 0) { console.log(this.flxTimeline); }
        this.offsetTop = 200 + Math.floor((Math.sin(this.flx3dBGmodT += .1) * 50) - 51) + 130;
        this.offsetLeft = 200 + Math.floor((Math.sin(this.flx3dBGmodL += .2) * 30) - 31) + 130;
        for (let i = 0; i < this.matrix.length; i++) {
            let x = this.matrix[i].x;
            let y = this.matrix[i].y;
            let z = this.matrix[i].z;
            let yTemp = y * this.costable[this.Xan] - z * this.sintable[this.Xan];
            let zTemp = y * this.sintable[this.Xan] + z * this.costable[this.Xan];
            y = yTemp;
            z = zTemp;
            let xTemp = x * this.costable[this.Yan] - z * this.sintable[this.Yan];
            zTemp = x * this.sintable[this.Yan] + z * this.costable[this.Yan];
            x = xTemp;
            z = zTemp;
            xTemp = x * this.costable[this.Zan] - y * this.sintable[this.Zan];
            yTemp = x * this.sintable[this.Zan] + y * this.costable[this.Zan];
            this.matrix2d[i] = { x: xTemp, y: yTemp };
        }

        this.Xan++, this.Yan++, this.Zan++;

        if (this.Xan >= 2200) { this.Xan = 0; }
        if (this.Yan >= 2200) { this.Yan = 0; }
        if (this.Zan >= 2200) { this.Zan = 0; }

        // draw 3d to 2d screen
        for (let i = 0; i < this.matrix.length; i++) {
            const pLeft = Math.round(this.matrix2d[i].x + this.offsetLeft) * 2;
            const pTop = Math.round(this.matrix2d[i].y + this.offsetTop) * 2;
            if (pLeft > this.maxW || pLeft < 0 || pTop < -10 || pTop > this.maxH) {
                this.px[i].style.display = 'none';
            } else {
                this.px[i].style.display = '';
                this.px[i].style.left = pLeft + 'px';
                this.px[i].style.top = pTop + 'px';
            }
        }

        // morph 3d objects
        if (this.flxTimeline < 100) { this.morph(); }
        if (this.flxTimeline === 160) { this.loadWGCLogo(); }
        if (this.flxTimeline > 160 && this.flxTimeline < 460) { this.morph(); }
        if (this.flxTimeline === 520) { this.loadRingObject(); }
        if (this.flxTimeline > 521 && this.flxTimeline < 850) { this.morph(); }
        if (this.flxTimeline === 900) { this.loadWGCLogo(); }
        if (this.flxTimeline > 901 && this.flxTimeline < 1250) { this.morph(); }

        const that = this;
        if (this.flxTimeline < 1900) { setTimeout(() => { that.playerLoop(); }, 100); }
    }

    morph() {
        // tslint:disable-next-line: max-line-length
        for (let i = 0; i < this.matrix.length; i++) { this.matrix[i] = { x: (this.pmorph(this.matrix[i].x, this.nmatrix[i].x)), y: (this.pmorph(this.matrix[i].y, this.nmatrix[i].y)), z: (this.pmorph(this.matrix[i].z, this.nmatrix[i].z)) }; }
    }
    morphXY() {
        // tslint:disable-next-line: max-line-length
        for (let i = 0; i < this.matrix.length; i++) { this.matrix[i] = { x: (this.pmorph(this.matrix[i].x, this.nmatrix[i].x)), y: (this.pmorph(this.matrix[i].y, this.nmatrix[i].y)) }; }
    }
    pmorph(cp, tp) {
        if (cp === tp) { return tp; }
        (cp < tp) ? cp += 1 : cp -= 1;
        return cp;
    }

    loadWGCLogo() {
        // tslint:disable-next-line: max-line-length
        const p = '61-30;61-31;61-32;61-33;61-34;61-35;61-36;61-37;61-38;61-39;61-40;61-41;61-42;61-43;61-44;61-45;61-46;61-47;61-48;61-49;61-50;61-51;61-52;61-53;61-54;61-55;61-56;61-57;61-58;61-59;61-60;61-61;61-62;61-63;61-64;61-65;61-66;61-78;61-79;61-88;61-89;61-90;61-99;61-100;61-119;61-120;61-140;61-141;61-142;61-143;61-144;61-145;62-28;62-29;62-67;62-68;62-77;62-80;62-87;62-91;62-98;62-101;62-118;62-121;62-138;62-139;62-146;62-147;63-26;63-27;63-69;63-70;63-77;63-80;63-87;63-91;63-98;63-101;63-118;63-121;63-137;63-148;63-169;64-25;64-71;64-77;64-80;64-87;64-91;64-98;64-101;64-118;64-121;64-136;64-140;64-141;64-142;64-143;64-144;64-145;64-148;64-168;64-170;65-25;65-71;65-77;65-81;65-87;65-91;65-97;65-101;65-118;65-121;65-135;65-139;65-146;65-147;65-168;65-170;66-24;66-72;66-78;66-81;66-86;66-92;66-97;66-100;66-107;66-108;66-109;66-110;66-111;66-118;66-121;66-124;66-125;66-126;66-127;66-135;66-138;66-155;66-156;66-157;66-158;66-159;66-160;66-166;66-167;66-168;66-171;66-172;66-173;66-181;66-182;66-183;66-184;66-185;67-24;67-72;67-78;67-81;67-86;67-92;67-97;67-100;67-105;67-106;67-112;67-118;67-121;67-123;67-128;67-134;67-137;67-154;67-161;67-165;67-174;67-179;67-180;67-186;68-23;68-31;68-32;68-33;68-34;68-35;68-36;68-37;68-38;68-39;68-40;68-41;68-42;68-43;68-44;68-45;68-46;68-47;68-48;68-49;68-50;68-51;68-52;68-53;68-54;68-55;68-56;68-57;68-58;68-59;68-60;68-61;68-62;68-63;68-64;68-65;68-73;68-78;68-81;68-86;68-92;68-97;68-100;68-104;68-108;68-109;68-110;68-113;68-118;68-122;68-129;68-134;68-137;68-153;68-155;68-157;68-159;68-162;68-166;68-167;68-171;68-172;68-173;68-178;68-182;68-183;68-184;68-187;69-23;69-30;69-66;69-73;69-78;69-81;69-86;69-89;69-92;69-97;69-100;69-104;69-107;69-111;69-114;69-118;69-123;69-124;69-125;69-126;69-129;69-134;69-136;69-154;69-168;69-170;69-178;69-181;69-185;69-188;70-23;70-30;70-66;70-73;70-78;70-81;70-85;70-88;70-90;70-93;70-97;70-100;70-103;70-106;70-112;70-114;70-118;70-122;70-127;70-130;70-134;70-136;70-143;70-144;70-145;70-146;70-147;70-160;70-163;70-168;70-170;70-177;70-180;70-186;70-188;71-23;71-30;71-66;71-73;71-79;71-82;71-85;71-88;71-90;71-93;71-96;71-99;71-103;71-106;71-112;71-114;71-118;71-121;71-128;71-130;71-134;71-136;71-142;71-148;71-160;71-168;71-170;71-177;71-180;71-186;71-188;72-23;72-30;72-66;72-73;72-79;72-82;72-85;72-88;72-90;72-93;72-96;72-99;72-103;72-107;72-109;72-111;72-114;72-118;72-121;72-128;72-130;72-134;72-136;72-143;72-144;72-145;72-148;72-154;72-155;72-157;72-159;72-163;72-168;72-170;72-177;72-181;72-183;72-185;72-188;73-23;73-30;73-66;73-73;73-79;73-82;73-84;73-87;73-91;73-94;73-96;73-99;73-103;73-106;73-108;73-110;73-112;73-113;73-118;73-121;73-128;73-130;73-134;73-136;73-146;73-148;73-153;73-156;73-158;73-168;73-170;73-177;73-180;73-182;73-184;73-186;73-187;74-23;74-30;74-66;74-73;74-80;74-82;74-84;74-87;74-91;74-94;74-96;74-98;74-103;74-106;74-118;74-121;74-128;74-130;74-134;74-137;74-146;74-148;74-152;74-155;74-160;74-163;74-168;74-170;74-177;74-180;75-23;75-30;75-66;75-73;75-80;75-83;75-87;75-91;75-95;75-98;75-103;75-106;75-118;75-121;75-128;75-130;75-135;75-138;75-146;75-148;75-152;75-155;75-160;75-168;75-170;75-177;75-180;76-23;76-30;76-66;76-73;76-80;76-86;76-92;76-98;76-103;76-106;76-118;76-122;76-123;76-127;76-130;76-135;76-139;76-146;76-148;76-152;76-155;76-160;76-163;76-168;76-170;76-177;76-180;77-23;77-30;77-66;77-73;77-81;77-86;77-92;77-97;77-104;77-107;77-113;77-118;77-124;77-125;77-126;77-129;77-136;77-141;77-142;77-143;77-144;77-145;77-148;77-152;77-155;77-160;77-168;77-171;77-173;77-178;77-181;77-187;78-23;78-30;78-66;78-73;78-81;78-86;78-92;78-97;78-105;78-108;78-110;78-112;78-114;78-118;78-121;78-122;78-127;78-128;78-137;78-138;78-147;78-153;78-156;78-158;78-163;78-169;78-172;78-174;78-179;78-182;78-184;78-186;78-188;79-24;79-25;79-26;79-27;79-28;79-29;79-67;79-68;79-69;79-70;79-71;79-72;79-82;79-83;79-84;79-85;79-93;79-94;79-95;79-96;79-106;79-107;79-109;79-111;79-113;79-119;79-120;79-123;79-124;79-125;79-126;79-139;79-140;79-141;79-142;79-143;79-144;79-145;79-146;79-154;79-155;79-157;79-159;79-161;79-162;79-170;79-171;79-173;79-180;79-181;79-183;79-185;79-187'.split(';');
        for (let i = 0; i < p.length; i++) {
            const p2: any = p[i].split('-');
            const x = p2[0] * 1.2;
            const y = p2[1] * 1.2;
            this.nmatrix[i] = { x: (y), y: (x), z: (1) };
        }
    }
    loadRingObject() {
        let radius = 120;
        for (let i = 0; i < this.nmatrix.length; i++) {
            radius += 0.07;
            // tslint:disable-next-line: max-line-length
            this.nmatrix[i] = { x: (Math.cos(i / 5) * (radius) + Math.random()), y: ((4 - radius) * 0.6 * Math.random()), z: (Math.sin(i / 5) * (radius) + Math.random()) };
        }
    }
    loadFieldObject() {
        let radius = 1;
        for (let i = 0; i < this.nmatrix.length; i++) {
            radius += 0.2;
            this.nmatrix[i] = { x: (Math.sin(i) * (radius)), y: (Math.cos(i / 5) * (radius)), z: (Math.sin(i / 5) * (radius)) };
        }
    }
    loadPoint() {
        for (let i = 0; i < this.nmatrix.length; i++) { this.nmatrix[i] = { x: (1), y: (1), z: (1) }; }
    }

    loadIntroText() {
        // tslint:disable-next-line: max-line-length
        const p = '73-77;74-73;74-75;74-76;75-65;75-66;75-67;75-68;75-69;75-70;75-71;75-72;75-75;75-92;75-93;75-94;75-95;75-96;75-97;75-98;75-99;75-100;75-137;75-138;75-139;75-140;75-141;75-142;75-143;75-144;75-145;76-64;76-69;76-74;76-91;76-95;76-99;76-117;76-136;76-140;76-144;77-63;77-69;77-74;77-90;77-91;77-94;77-95;77-116;77-117;77-135;77-136;77-139;77-140;78-63;78-69;78-74;78-77;78-78;78-82;78-83;78-84;78-90;78-94;78-104;78-105;78-106;78-107;78-111;78-112;78-113;78-116;78-122;78-123;78-124;78-127;78-128;78-130;78-131;78-135;78-139;78-149;78-150;78-151;78-152;78-156;78-157;78-158;78-159;79-63;79-64;79-68;79-69;79-73;79-74;79-75;79-76;79-77;79-81;79-84;79-90;79-94;79-95;79-96;79-97;79-102;79-103;79-106;79-110;79-115;79-116;79-117;79-118;79-121;79-124;79-126;79-127;79-128;79-129;79-135;79-139;79-140;79-141;79-142;79-148;79-151;79-152;79-155;79-158;79-159;80-68;80-73;80-77;80-81;80-83;80-84;80-93;80-94;80-102;80-106;80-110;80-116;80-121;80-123;80-124;80-127;80-128;80-138;80-139;80-147;80-151;80-154;80-158;81-67;81-68;81-73;81-77;81-80;81-81;81-82;81-93;81-94;81-102;81-105;81-106;81-111;81-115;81-116;81-120;81-121;81-122;81-127;81-138;81-139;81-147;81-151;81-154;81-158;82-67;82-68;82-73;82-76;82-77;82-80;82-92;82-93;82-101;82-102;82-105;82-112;82-115;82-120;82-127;82-137;82-138;82-147;82-150;82-154;82-157;83-67;83-72;83-73;83-76;83-78;83-80;83-84;83-92;83-93;83-99;83-101;83-102;83-104;83-105;83-106;83-108;83-112;83-115;83-118;83-120;83-124;83-127;83-137;83-138;83-144;83-148;83-149;83-150;83-155;83-156;83-157;84-65;84-66;84-67;84-68;84-72;84-76;84-77;84-81;84-82;84-83;84-91;84-92;84-93;84-94;84-95;84-96;84-97;84-98;84-102;84-103;84-105;84-109;84-110;84-111;84-116;84-117;84-121;84-122;84-123;84-126;84-136;84-137;84-138;84-139;84-140;84-141;84-142;84-143;84-150;84-157;85-150;85-157;86-145;86-149;86-152;86-156;87-144;87-149;87-151;87-156;88-60;88-65;88-69;88-72;88-74;88-75;88-77;88-78;88-79;88-81;88-82;88-83;88-84;88-85;88-86;88-87;88-88;88-89;88-90;88-91;88-92;88-93;88-94;88-95;88-96;88-97;88-98;88-99;88-100;88-101;88-102;88-103;88-104;88-105;88-106;88-107;88-108;88-109;88-110;88-111;88-112;88-113;88-114;88-115;88-116;88-117;88-118;88-119;88-120;88-121;88-122;88-123;88-124;88-125;88-126;88-127;88-128;88-129;88-130;88-131;88-132;88-133;88-134;88-135;88-136;88-137;88-138;88-139;88-140;88-142;88-145;88-147;88-148;88-152;88-154;88-155;89-146;89-153;94-97;94-98;94-99;94-100;94-102;94-109;94-110;94-111;94-112;94-114;94-118;94-120;94-123;94-124;94-125;94-128;94-132;95-87;95-96;95-102;95-108;95-115;95-117;95-120;95-122;95-126;95-128;95-129;95-132;96-87;96-88;96-96;96-97;96-98;96-99;96-100;96-102;96-108;96-109;96-110;96-111;96-112;96-116;96-120;96-122;96-126;96-128;96-130;96-132;97-87;97-89;97-91;97-93;97-96;97-102;97-108;97-115;97-117;97-120;97-122;97-126;97-128;97-131;97-132;98-87;98-88;98-92;98-96;98-103;98-104;98-105;98-106;98-109;98-110;98-111;98-112;98-114;98-118;98-120;98-123;98-124;98-125;98-128;98-132;99-91'.split(';');
        for (let i = 0; i < p.length; i++) {
            const p2: any = p[i].split('-');
            const x = (p2[0] - 50) * 2;
            const y = (p2[1] - 0 + 25) * 2;
            this.nmatrix[i] = { x: (y), y: (x), z: (1) };
        }
    }
}
