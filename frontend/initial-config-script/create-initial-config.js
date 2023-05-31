const AWS = require('aws-sdk');
const documentClient = new AWS.DynamoDB.DocumentClient({ convertEmptyValues: true });

const S3BUCKET_CDN = process.env.S3BUCKET_CDN || '';
const S3BUCKET_TEST = process.env.S3BUCKET_TEST || '';
const S3BUCKET_TEST_URL = process.env.S3BUCKET_TEST_URL || '';
const S3BUCKET_PROD = process.env.S3BUCKET_PROD || '';
const S3BUCKET_PROD_URL = process.env.S3BUCKET_PROD_URL || '';
const DYNAMO_TABLE_NAME = process.env.DYNAMO_TABLE_NAME || '';
const CFDIST_CDN_ID = process.env.CFDIST_CDN_ID || '';
const CFDIST_CDN_URL = process.env.CFDIST_CDN_URL || '';
const CFDIST_PROD_ID = process.env.CFDIST_PROD_ID || '';
const CFDIST_PROD_URL = process.env.CFDIST_PROD_URL || '';
const REGION = process.env.REGION || 'eu-central-1';

async function createInitialConfig() {

    const tableName = DYNAMO_TABLE_NAME;
    if (tableName === '') {
        console.error("Error in initial config script: $DYNAMO_TABLE_NAME parameter missing");
        return false;
    }

    let doc = await documentClient.get({ TableName: tableName, Key: { id: 'config' } }).promise();
    if (doc && doc.Item) {
        console.log('Configuration document already exists in table ' + tableName);
        return;
    } else { // Create initial config
        console.log('Creating initial configuration document in DynamoDB');
        const cfgdoc = { id: 'config', apptitle: CFDIST_PROD_URL, buckets: [], cfdists: [] };

        cfgdoc.buckets.push({
            bucketname: S3BUCKET_CDN,
            cdnURL: 'https://' + CFDIST_CDN_URL,
            label: 'CDN',
            noPublish: true,
            pastedImages: true,
            preventDelete: true,
            webURL: 'https://' + S3BUCKET_CDN + '.s3.' + REGION + '.amazonaws.com/'
        });

        cfgdoc.buckets.push({
            bucketname: S3BUCKET_PROD,
            cdnURL: 'https://' + CFDIST_PROD_URL,
            label: 'Production',
            preventDelete: true,
            webURL: 'https://' + S3BUCKET_PROD + '.s3.' + REGION + '.amazonaws.com/'
        });

        cfgdoc.buckets.push({
            bucketname: S3BUCKET_TEST,
            label: 'Test',
            preventDelete: true,
            webURL: 'https://' + S3BUCKET_TEST + '.s3.' + REGION + '.amazonaws.com/'
        });

        cfgdoc.cfdists.push({
            cfid: CFDIST_CDN_ID,
            label: CFDIST_CDN_URL,
            preventDelete: true,
            webURL: 'https://' + CFDIST_CDN_URL,
            webURLVAR: 'CDNWEBURL'
        });

        cfgdoc.cfdists.push({
            cfid: CFDIST_PROD_ID,
            label: CFDIST_PROD_URL,
            preventDelete: true,
            webURL: 'https://' + CFDIST_PROD_URL,
            webURLVAR: ''
        });

        cfgdoc.instanceID = guid();

        await documentClient.put({ TableName: tableName, Item: cfgdoc }).promise();
        console.log('Configuration document created', cfgdoc);
    }
}

function guid() {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
    }
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}

createInitialConfig();