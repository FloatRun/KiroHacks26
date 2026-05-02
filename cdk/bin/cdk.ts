#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib/core';
import { FirstAidAiKbStack } from '../lib/firstaid-ai-kb-stack';
import { FirstAidAiLambdaStack } from '../lib/firstaid-ai-lambda-stack';

const app = new cdk.App();

// Knowledge Base stack
const kbStack = new FirstAidAiKbStack(app, 'FirstAidAiKbStack', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: 'us-west-2' },
});

// Lambda + API Gateway stack (depends on KB)
new FirstAidAiLambdaStack(app, 'FirstAidAiLambdaStack', {
  env: { account: '495599767146', region: 'us-west-2' },
  knowledgeBaseId: 'KM7JPBMFIY', // Hardcoded as provided
});
