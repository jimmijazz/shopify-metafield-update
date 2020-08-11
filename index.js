const express = require('express');
const getRawBody = require('raw-body');
const crypto = require('crypto');
const request = require('request');
var bodyParser = require('body-parser')
const fetch = require("node-fetch");

const app = express();
var port = 80;


const secretKey = 'c0a36b35ac7f9bf4a731fe0425e2abf0112650de1d5c14c990e132bf03758150';

app.use('/webhooks', bodyParser.raw({ type: 'application/json' }))
app.use(bodyParser.json())


const Shopify = require('shopify-api-node');

const shopify = new Shopify({
  shopName: 'bitossi',
  apiKey: 'bb758df9c32df36425e0f175f6eebd29',
  password: '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'
});

// shopify.on('callLimits', (limits) => console.log(limits));


function getMetafields(productID, product) {
  // product ID = int. Product = full JSON
  console.log("productID: ", productID)
  shopify.metafield
  .list({
    metafield: { owner_resource: 'product', owner_id: productID}
  })
  .then(
    (metafields) => checkMetafieldsAndTags(product, metafields),
    (err) => console.log("Err: err")
  );
};

function checkMetafieldsAndTags(product, metafields) {
  console.log("Product metafields: ", metafields);
  console.log("Product: ", product)
  // Check if the product has metafields

  var tags = product["tags"].split(",");
  var product_id = product["id"];


  var newTags = "";
  // Check all of the metafields
  metafields.forEach(function(m) {
    if (m.namespace === "location" && m.key === "city") {
      // Check if product has a tag for that city
      if (!tags.includes(m.value)) {
        // Add tag
        newTags += m.value;
      };
    }
  });

  // Add tags if needed
  if (newTags.length > 0) {
    shopify.product.update(product_id, {
      "id": product_id,
      "tags": newTags
    });
  };
};

function log(err){
  // console.log("error message: ", err)
}
// https://medium.com/@scottdixon/verifying-shopify-webhooks-with-nodejs-express-ac7845c9e40a
app.post('/webhooks/product/update', async (req, res) => {
  console.log('🎉 We got an order!')

  // We'll compare the hmac to our own hash
  const hmac = req.get('X-Shopify-Hmac-Sha256')

  // Create a hash using the body and our key
  const hash = crypto
    .createHmac('sha256', secretKey)
    .update(req.body, 'utf8', 'hex')
    .digest('base64')

  // Compare our hash to Shopify's hash
  if (hash === hmac) {
    // It's a match! All good
    console.log('Phew, it came from Shopify!');
    var webhookResponse = JSON.parse(req.body.toString());

    getMetafields(webhookResponse["id"], webhookResponse); // Get and log metafields


    res.sendStatus(200)
  } else {
    // No match! This request didn't originate from Shopify
    console.log('Danger! Not from Shopify!')
    res.sendStatus(403)
  }
})

app.get("/shopify/search/:handle", (req, res) => {
    var handle = req.params.handle;

    // request('https://bitossi.myshopify.com/admin/api/2019-07/graphql.json', query).then((data) => console.log(data))

    // var wholesale toke = 3cf59c2374d79aab0e0397490e65e1d1
    // var store = bitossi
    var token = "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"
      fetch("https://bitossi.myshopify.com/admin/api/graphql.json", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": token
        },
        body: JSON.stringify({
          query: `
          {
            productByHandle(handle: "balter-new-south-wales-lager") {
              metafields(first: 5, namespace: "location") {
                edges{
                  node{
                    key
                    value
                  }
                }
              }
            }
          }
           `
        })
      })
        .then(result => {
          return result.json();
        })
        .then(data => {
          console.log("data returned:\n", data);
          res.send(data);
        });    // console.log(query);
});

app.listen(port, console.log("Running"));
