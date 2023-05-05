// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
export enum Category {
    Footware = "Footware",
    Apparel = "Apparel",
    Eyewear = "Eyewear"
}

export enum Partner {
    Partner1 = "Partner1",
    Partner2 = "Partner2",
    Partner3 = "Partner3"
}

export enum Size {
    M = "M",
    S = "S",
    L = "L"
}

export enum Color {
    Black = "Black",
    White = "White",
    Blue = "Blue",
    Red = "Red",
    Yellow = "Yellow",
    Pink = "Pink",
    Other = "Other"
}

export enum OrderStatus {
    Pending = "Pending",
    InProgress = "InProgress",
    Delivered = "Delivered",
    Completed = "Completed",
    Failed = "Failed",
    Cancelled = "Cancelled"
}

export interface CustomerAddress {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
}

export interface Customer {
    email: string,
    address?: CustomerAddress
}

export interface PartnerSchema {
    partnerId: string,
    name: Partner,
    webhook: string,
    category: string
}

export interface ItemRequestSchema {
    requestedItem: ItemSchema,
    customer: Customer
}

export interface ItemSchema {
    itemId: string,
    price: number,
    size: Size,
    quantity: number,
    sku: string,
    category?: Category,
    image: string,
    partner: Partner,
    partnerId: string,
    description?: string,
    color?: string
}

export interface OrderSchema {
    orderId: string,
    partnerId: string,
    product: {
        itemId: string,
        quantity: number,
        size: Size,
    },
    shippingAddress?: CustomerAddress,
    orderDate: number,
    subtotal: number,
    price: number,
    salestax: string,
    orderStatus: OrderStatus,
    statusDescription?: string,
    partner: Partner,
    subscribers: Customer[],
    messageId?: string
}