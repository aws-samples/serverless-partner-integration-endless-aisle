import { JsonSchemaType } from "aws-cdk-lib/aws-apigateway";

export const CreateOrderSchema = {
  type: JsonSchemaType.OBJECT,
  properties: {
    requestedItem: {
      type: JsonSchemaType.OBJECT,
      properties: {
        itemId: { type: JsonSchemaType.STRING, maxLength: 64 },
        price: { type: JsonSchemaType.NUMBER },
        size: { type: JsonSchemaType.STRING, },
        quantity: { type: JsonSchemaType.NUMBER },
        sku: { type: JsonSchemaType.STRING },
        category: { type: JsonSchemaType.STRING },
        partner: { type: JsonSchemaType.STRING, maxLength: 16, enum: ["Partner1", "Partner2", "Partner3"] },
        partnerId: { type: JsonSchemaType.STRING },
        description: { type: JsonSchemaType.STRING },
        color: { type: JsonSchemaType.STRING }
      }
    },
    customer: {
      type: JsonSchemaType.OBJECT,
      properties: {
        email: { type: JsonSchemaType.STRING },
        contact: { type: JsonSchemaType.STRING },
        address: { type: JsonSchemaType.STRING }
      }
    }
  },
};

export const GetOrderSchema = {
  type: JsonSchemaType.OBJECT,
  properties: {
    id: { type: JsonSchemaType.STRING },
  },
};

export const PostPartnerOrderSchema = {
  type: JsonSchemaType.OBJECT,
  required: ["itemId", "partner", "quantity"],
  properties: {
    itemId: { type: JsonSchemaType.STRING, maxLength: 64 },
    sku: { type: JsonSchemaType.STRING, maxLength: 64 },
    quantity: { type: JsonSchemaType.NUMBER },
    partner: { type: JsonSchemaType.STRING, maxLength: 16, enum: ["Partner1", "Partner2", "Partner3"] },
    partnerId: { type: JsonSchemaType.STRING }
  },
};

export const UpdateOrderSchema = {
  type: JsonSchemaType.OBJECT,
  required: ["id", "orderStatus", "partnerId"],
  properties: {
    id: { type: JsonSchemaType.STRING },
    orderStatus: { type: JsonSchemaType.STRING, maxLength: 16, enum: ["Placed", "Pending", "Failed", "Fulfilled"] },
    partnerId: { type: JsonSchemaType.STRING, maxLength: 64 },
  },
};

export const GetItemSchema = {
  type: JsonSchemaType.OBJECT,
  required: ["id"],
  properties: {
    id: { type: JsonSchemaType.STRING },
    partner: { type: JsonSchemaType.STRING, maxLength: 16, enum: ["Partner1", "Partner2", "Partner3"] },
  },
};