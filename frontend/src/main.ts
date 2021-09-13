
import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

// AWS Amplify for Cognito
import Amplify from '@aws-amplify/core';
import awsconfig from './aws-config';
Amplify.configure({ Auth: awsconfig });

if (environment.production) {
  enableProdMode();
}

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.error(err));
