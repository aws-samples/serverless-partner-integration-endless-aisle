# Welcome to  Endless Aisle CDK TypeScript project

This is a Endless Aisle project for Infrastructure development with TypeScript.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `cdk deploy`      deploy this stack to your default AWS account/region
* `cdk diff`        compare deployed stack with current state
* `cdk synth`       emits the synthesized CloudFormation template


## Request templates

---
Mock order Partner API
- order look up
  
```bash
- HTTP Method 
    GET

- URL: 
    https://<REST-API-ID>.execute-api.<AWS-REGION>.amazonaws.com/prod/inventory/itemId=1&partner=Partner1&quantity=1
```

- send mock order

```bash
- HTTP Method 
    POST

- URL: 
    https://<REST-API-ID>.execute-api.<AWS-REGION>.amazonaws.com/prod/inventory
```
 BODY
```json
{"itemId":"1","partner":"Partner1","quantity":1}
```

---
Orders API

- create order api /orders post
  
```bash
- HTTP Method 
    POST

- URL: 
    https://<REST-API-ID>.execute-api.<AWS-REGION>.amazonaws.com/prod/orders
```
 BODY
```json
{"requestedItem":{"itemId":"1","quantity":1,"size":"1","partner":"Partner1","price":1,"partnerId":"1","sku":"1","category":"1"},"customer":{"address":"test @test.com","contact":"test","email":"test"}}
```

- Get Order api /orders/{id} get

```bash
- HTTP Method 
GET

- URL

https://<REST-API-ID>.execute-api.<AWS-REGION>.amazonaws.com/prod/orders/1?partner=Partner1
```

--- 
Item API

-  Get item api /items/{id} get
  
```bash
- HTTP Method 
    GET

- URL:
    https://<REST-API-ID>.execute-api.<AWS-REGION>.amazonaws.com/prod/items/10?partner=Partner1&partnerId=1&quantity=1
```