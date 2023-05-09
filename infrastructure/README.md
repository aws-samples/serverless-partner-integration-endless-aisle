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

- create order api /orders/order post
  
```bash
- HTTP Method 
    POST

- URL: 
    https://<REST-API-ID>.execute-api.<AWS-REGION>.amazonaws.com/prod/orders/order
```
 BODY
```json
{"requestedItem":{"itemId":"1","quantity":1,"size":"1","partner":"Partner1","price":1,"partnerId":"1","sku":"1","category":"1"},"customer":{"address":"test @test.com","contact":"test","email":"test"}}
```

- Get Order api /Orders/order/{id} get

```bash
- HTTP Method 
GET

- URL

https://<REST-API-ID>.execute-api.<AWS-REGION>.amazonaws.com/prod/orders/order/1?partnerId=1&partner=Partner1
```

- Patch Order api /Orders/order/{id} PATCH

```bash
- HTTP Method 
    PATCH

- URL: 
    https://<REST-API-ID>.execute-api.<AWS-REGION>.amazonaws.com/prod/orders/order/:orderId
```

BODY
```json
    {"partnerId":"1","orderStatus":"Completed"}
```

--- 
Item API

-  Get item api /Items/item/{id} get
  
```bash
- HTTP Method 
    GET

- URL:
    https://<REST-API-ID>.execute-api.<AWS-REGION>.amazonaws.com/prod/items/item/10?partner=Partner1&partnerId=1&quantity=1
```