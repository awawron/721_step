const express = require("express");
const recordRoutes = express.Router();
const dbo = require("../db/conn");
const ObjectId = require("mongodb").ObjectId;

recordRoutes.route("/products").get(async function (req, res) {
  let db_connect = dbo.getDb("store");
  try {
    const filter = {};
    const sort = {};

    if (req.query.name) {
      filter.name = req.query.name;
    }

    if (req.query.sortBy) {
      sort[req.query.sortBy] = req.query.order === "desc" ? -1 : 1;
    }

    const products = await db_connect
      .collection("products")
      .find(filter)
      .sort(sort)
      .toArray();
    res.send(products);
  } catch (err) {
    console.log(err);
    res.status(500).send({ error: "Error fetching products" });
  }
});

recordRoutes.route("/products").post(async function (req, res) {
  let db_connect = dbo.getDb("store");
  try {
    const { name, price, description, quantity, unit } = req.body;
    const existingProduct = await db_connect
      .collection("products")
      .findOne({ name });

    if (existingProduct) {
      res
        .status(400)
        .send({ error: "Product with the same name already exists" });
    } else {
      const product = { name, price, description, quantity, unit };
      await db_connect.collection("products").insertOne(product);
      res.send(product);
    }
  } catch (err) {
    console.log(err);
    res.status(500).send({ error: "Error adding product" });
  }
});

recordRoutes.route("/products/:id").post(async function (req, res) {
  let db_connect = dbo.getDb("store");
  try {
    const { name, price, description, quantity, unit } = req.body;
    const id = ObjectId(parseInt(req.params.id));
    const existingProduct = await db_connect
      .collection("products")
      .findOne({ _id: id });

    if (!existingProduct) {
      res.status(400).send({ error: "Product not found" });
    } else {
      const product = { name, price, description, quantity, unit };
      await db_connect
        .collection("products")
        .updateOne({ _id: id }, { $set: product })
        .then(res.send(product));
    }
  } catch (err) {
    console.log(err);
    res.status(500).send({ error: "Error updating product" });
  }
});

recordRoutes.route("/products/:id").delete(async function (req, res) {
  let db_connect = dbo.getDb("store");
  try {
    const id = ObjectId(parseInt(req.params.id));

    await db_connect
      .collection("products")
      .findOneAndDelete({ _id: id }, (err, result) => {
        if (!result.value) {
          return res.status(404).send({ error: "Product not found" });
        }
        return res.send({ message: "Product deleted" });
      });
  } catch (err) {
    console.log(err);
    res.status(500).send({ error: "Failed to delete product" });
  }
});

recordRoutes.route("/report").get(async function (req, res) {
  let db_connect = dbo.getDb("store");
  try {
    const report = await db_connect
      .collection("products")
      .aggregate([
        {
          $group: {
            _id: null,
            totalQuantity: { $sum: "$quantity" },
            totalValue: { $sum: { $multiply: ["$quantity", "$price"] } },
          },
        },
      ])
      .toArray();
    res.send(report);
  } catch (err) {
    console.log(err);
    res.status(500).send({ error: "Failed to generate report" });
  }
});

module.exports = recordRoutes;
