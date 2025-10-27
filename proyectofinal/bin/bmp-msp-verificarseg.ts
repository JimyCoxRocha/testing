#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { BMPIniciarSesion } from "../lib/bmp-msp-verificarseg-stack";
import { BuildConfig } from "../config/buildConfig";

const cdkApp = new cdk.App();
const nameStackApplication = `bmp-msp-verificarseg`;

const Main = async (app: cdk.App) => {
  const stage = app.node.tryGetContext("stage") || "dev";
  const region = app.node.tryGetContext("region") || "us-east-1";

  const buildCondig = new BuildConfig(nameStackApplication, stage);
  const config = await buildCondig.getConfig();
  const _stack = new BMPIniciarSesion(
    app,
    `${nameStackApplication}-${stage}`,
    {
      env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: region,
      },
      tags: config,
    }
  );
  app.synth();
  console.log("stack:", _stack);

};

Main(cdkApp); // entry point of the application
