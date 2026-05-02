#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib/core';
import { FirstAidAiKbStack } from '../lib/firstaid-ai-kb-stack';

const app = new cdk.App();
new FirstAidAiKbStack(app, 'FirstAidAiKbStack', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: 'us-west-2' },
});
