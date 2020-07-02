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

import { Injectable, Pipe, PipeTransform } from '@angular/core'; // for view filter
@Pipe({
  name: 'searchfilter'
 })

 @Injectable()
 export class SearchFilterPipe implements PipeTransform {
  transform(items: any[], fields: any[], searchstring: string): any[] {
      if (!items || !searchstring) { return items; }
      const LCvalue = searchstring.toLowerCase();
      return items.filter( (item) => {
          for (const fld of fields) {
            if (typeof item[fld] !== 'undefined') {
              const thisFld = item[fld] || '';
              if (thisFld.toLowerCase().indexOf(LCvalue) !== -1) { return true; }
            }
          }
          return false;
      });
  }
 }
