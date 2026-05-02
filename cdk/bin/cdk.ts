#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib/core';
import { FirstAidAiKbStack } from '../lib/firstaid-ai-kb-stack';
import { FirstAidAiApiStack } from '../lib/firstaid-ai-api-stack';

const app = new cdk.App();

const env = { account: process.env.CDK_DEFAULT_ACCOUNT, region: 'us-west-2' };

const kbStack = new FirstAidAiKbStack(app, 'FirstAidAiKbStack', { env });

const apiStack = new FirstAidAiApiStack(app, 'FirstAidAiApiStack', {
  env,
  knowledgeBaseId: kbStack.knowledgeBaseId,
  // Update this once you have your CloudFront domain:
  // allowedOrigin: 'https://d1234abcdef.cloudfront.net',
});

apiStack.addDependency(kbStack);
