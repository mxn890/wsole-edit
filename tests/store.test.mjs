import test from 'node:test';
import assert from 'node:assert/strict';
import {product,place,publicOrder} from '../lib/validation.mjs';
import seed from '../data/seed.json' with {type:'json'};
const buyer={name:'Test Customer',email:'test@example.com',phone:'03001234567',address:'Test address',city:'Karachi',province:'Sindh',postal:'74000',key:'12345678-1234-1234-1234-123456789012',items:[{id:1,size:42,qty:1}]};
test('server calculates prices and stock, and order retries are idempotent',()=>{const s=structuredClone(seed);const o=place(s,{...buyer,total:1});assert.equal(o.total,4740);assert.equal(s.products[0].stock,0);assert.equal(s.orders.length,1);assert.equal(place(s,buyer).ref,o.ref);assert.equal(s.orders.length,1);assert.equal(publicOrder(o).customer,undefined);});
test('sold-out and invalid-size orders cannot modify inventory',()=>{const s=structuredClone(seed);assert.throws(()=>place(s,{...buyer,items:[{id:1,size:99,qty:1}]}),/size/);assert.equal(s.products[0].stock,1);place(s,buyer);assert.throws(()=>place(s,{...buyer,key:'different-key-at-least-20chars'}),/stock/);});
test('product validation rejects unsafe images and invalid pricing',()=>{assert.throws(()=>product({...seed.products[0],price:-1},seed.categories),/price/);assert.throws(()=>product({...seed.products[0],images:['javascript:alert(1)']},seed.categories),/image/);const p=product({...seed.products[0],description:'Updated'},seed.categories);assert.equal(p.description,'Updated');});
