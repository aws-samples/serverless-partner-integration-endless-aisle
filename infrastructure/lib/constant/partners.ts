// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import { Category, Partner } from '../lambda/utils/schema'

export const Partners = [{
    partnerId: "1",
    name: Partner.Partner1,
    category: Category.Footware,
    image: 'test.jpg'
},
{
    partnerId: "2",
    name: Partner.Partner2,
    category: Category.Apparel,
    image: 'test.jpg'
},
{
    partnerId: "3",
    name: Partner.Partner3,
    category: Category.Eyewear,
    image: 'test.jpg'
}]