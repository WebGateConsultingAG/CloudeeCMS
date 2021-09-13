import { environment } from '../../environments/environment';
const cfg = {
    region: environment.region,
    userPoolId: environment.userPoolId,
    userPoolWebClientId: environment.userPoolWebClientId,
    identityPoolId: '',
    oauth: {
        domain: environment.domain,
        scope: ['email', 'openid', 'profile', 'aws.cognito.signin.user.admin'],
        redirectSignIn: environment.redirectURL,
        redirectSignOut: environment.redirectURL,
        responseType: 'code'
    }
};

export default cfg;
