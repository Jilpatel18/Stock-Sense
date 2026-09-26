import { pool } from "./db";
import { initDatabase } from "./schema";

export async function validateReceipt(receiptId: number, userId: number) {
  await initDatabase();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Fetch receipt
    const receiptRes = await client.query(
      `SELECT * FROM receipts WHERE id = $1 FOR UPDATE`,
      [receiptId]
    );
    if (receiptRes.rows.length === 0) {
      throw new Error(`Receipt #${receiptId} not found`);
    }
    const receipt = receiptRes.rows[0];
    if (receipt.status === "Done") {
      throw new Error(`Receipt ${receipt.receipt_number} is already validated.`);
    }
    if (receipt.status === "Canceled") {
      throw new Error(`Receipt ${receipt.receipt_number} is canceled.`);
    }

    // Fetch receipt items
    const itemsRes = await client.query(
      `SELECT ri.*, p.name as product_name 
       FROM receipt_items ri
       JOIN products p ON ri.product_id = p.id
       WHERE ri.receipt_id = $1`,
      [receiptId]
    );

    if (itemsRes.rows.length === 0) {
      throw new Error("Cannot validate a receipt with no items.");
    }

    const destLocationId = receipt.destination_location_id;

    for (const item of itemsRes.rows) {
      const qty = parseFloat(item.quantity);

      // Fetch or create inventory row
      const invRes = await client.query(
        `SELECT * FROM inventory WHERE product_id = $1 AND location_id = $2 FOR UPDATE`,
        [item.product_id, destLocationId]
      );

      let qtyBefore = 0;
      let qtyAfter = qty;

      if (invRes.rows.length > 0) {
        qtyBefore = parseFloat(invRes.rows[0].quantity);
        qtyAfter = qtyBefore + qty;
        await client.query(
          `UPDATE inventory SET quantity = $1, updated_at = NOW() WHERE id = $2`,
          [qtyAfter, invRes.rows[0].id]
        );
      } else {
        await client.query(
          `INSERT INTO inventory (product_id, location_id, quantity, updated_at) VALUES ($1, $2, $3, NOW())`,
          [item.product_id, destLocationId, qtyAfter]
        );
      }

      // Create Stock Ledger Entry
      await client.query(
        `INSERT INTO stock_ledger 
         (product_id, location_id, operation_type, reference_type, reference_id, reference_number, quantity_before, quantity_change, quantity_after, performed_by, created_at)
         VALUES ($1, $2, 'RECEIPT', 'RECEIPT', $3, $4, $5, $6, $7, $8, NOW())`,
        [
          item.product_id,
          destLocationId,
          receipt.id,
          receipt.receipt_number,
          qtyBefore,
          qty,
          qtyAfter,
          userId,
        ]
      );
    }

    // Update Receipt status to Done
    await client.query(
      `UPDATE receipts SET status = 'Done', validated_by = $1, validated_at = NOW(), updated_at = NOW() WHERE id = $2`,
      [userId, receiptId]
    );

    await client.query("COMMIT");
    return { success: true, message: `Receipt ${receipt.receipt_number} validated successfully.` };
  } catch (err: any) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function validateDelivery(deliveryId: number, userId: number) {
  await initDatabase();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Fetch delivery
    const delRes = await client.query(
      `SELECT * FROM delivery_orders WHERE id = $1 FOR UPDATE`,
      [deliveryId]
    );
    if (delRes.rows.length === 0) {
      throw new Error(`Delivery Order #${deliveryId} not found`);
    }
    const delivery = delRes.rows[0];
    if (delivery.status === "Done") {
      throw new Error(`Delivery Order ${delivery.delivery_number} is already validated.`);
    }
    if (delivery.status === "Canceled") {
      throw new Error(`Delivery Order ${delivery.delivery_number} is canceled.`);
    }

    // Fetch delivery items
    const itemsRes = await client.query(
      `SELECT di.*, p.name as product_name, p.sku
       FROM delivery_items di
       JOIN products p ON di.product_id = p.id
       WHERE di.delivery_id = $1`,
      [deliveryId]
    );

    if (itemsRes.rows.length === 0) {
      throw new Error("Cannot validate a delivery with no items.");
    }

    const srcLocationId = delivery.source_location_id;

    for (const item of itemsRes.rows) {
      const qtyNeeded = parseFloat(item.quantity);

      // Check current inventory
      const invRes = await client.query(
        `SELECT * FROM inventory WHERE product_id = $1 AND location_id = $2 FOR UPDATE`,
        [item.product_id, srcLocationId]
      );

      const currentQty = invRes.rows.length > 0 ? parseFloat(invRes.rows[0].quantity) : 0;

      if (currentQty < qtyNeeded) {
        throw new Error(
          `Insufficient stock for "${item.product_name}" (${item.sku}). Requested: ${qtyNeeded}, Available: ${currentQty}`
        );
      }

      const qtyBefore = currentQty;
      const qtyAfter = currentQty - qtyNeeded;

      await client.query(
        `UPDATE inventory SET quantity = $1, updated_at = NOW() WHERE id = $2`,
        [qtyAfter, invRes.rows[0].id]
      );

      // Create Stock Ledger Entry
      await client.query(
        `INSERT INTO stock_ledger 
         (product_id, location_id, operation_type, reference_type, reference_id, reference_number, quantity_before, quantity_change, quantity_after, performed_by, created_at)
         VALUES ($1, $2, 'DELIVERY', 'DELIVERY', $3, $4, $5, $6, $7, $8, NOW())`,
        [
          item.product_id,
          srcLocationId,
          delivery.id,
          delivery.delivery_number,
          qtyBefore,
          -qtyNeeded,
          qtyAfter,
          userId,
        ]
      );
    }

    // Update Delivery status to Done
    await client.query(
      `UPDATE delivery_orders SET status = 'Done', validated_by = $1, validated_at = NOW(), updated_at = NOW() WHERE id = $2`,
      [userId, deliveryId]
    );

    await client.query("COMMIT");
    return { success: true, message: `Delivery Order ${delivery.delivery_number} validated successfully.` };
  } catch (err: any) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function validateTransfer(transferId: number, userId: number) {
  await initDatabase();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Fetch transfer
    const trnRes = await client.query(
      `SELECT * FROM internal_transfers WHERE id = $1 FOR UPDATE`,
      [transferId]
    );
    if (trnRes.rows.length === 0) {
      throw new Error(`Internal Transfer #${transferId} not found`);
    }
    const transfer = trnRes.rows[0];
    if (transfer.status === "Done") {
      throw new Error(`Transfer ${transfer.transfer_number} is already validated.`);
    }
    if (transfer.status === "Canceled") {
      throw new Error(`Transfer ${transfer.transfer_number} is canceled.`);
    }

    // Fetch transfer items
    const itemsRes = await client.query(
      `SELECT iti.*, p.name as product_name, p.sku
       FROM internal_transfer_items iti
       JOIN products p ON iti.product_id = p.id
       WHERE iti.transfer_id = $1`,
      [transferId]
    );

    if (itemsRes.rows.length === 0) {
      throw new Error("Cannot validate a transfer with no items.");
    }

    const srcLocId = transfer.source_location_id;
    const destLocId = transfer.destination_location_id;

    if (srcLocId === destLocId) {
      throw new Error("Source and destination locations cannot be identical.");
    }

    for (const item of itemsRes.rows) {
      const qtyMove = parseFloat(item.quantity);

      // 1. Source location check & decrease
      const srcInvRes = await client.query(
        `SELECT * FROM inventory WHERE product_id = $1 AND location_id = $2 FOR UPDATE`,
        [item.product_id, srcLocId]
      );

      const srcCurrentQty = srcInvRes.rows.length > 0 ? parseFloat(srcInvRes.rows[0].quantity) : 0;
      if (srcCurrentQty < qtyMove) {
        throw new Error(
          `Insufficient stock for "${item.product_name}" at source location. Requested: ${qtyMove}, Available: ${srcCurrentQty}`
        );
      }

      const srcQtyBefore = srcCurrentQty;
      const srcQtyAfter = srcCurrentQty - qtyMove;

      await client.query(
        `UPDATE inventory SET quantity = $1, updated_at = NOW() WHERE id = $2`,
        [srcQtyAfter, srcInvRes.rows[0].id]
      );

      // Source Ledger Entry (TRANSFER_OUT)
      await client.query(
        `INSERT INTO stock_ledger 
         (product_id, location_id, operation_type, reference_type, reference_id, reference_number, quantity_before, quantity_change, quantity_after, performed_by, created_at)
         VALUES ($1, $2, 'TRANSFER_OUT', 'TRANSFER', $3, $4, $5, $6, $7, $8, NOW())`,
        [
          item.product_id,
          srcLocId,
          transfer.id,
          transfer.transfer_number,
          srcQtyBefore,
          -qtyMove,
          srcQtyAfter,
          userId,
        ]
      );

      // 2. Destination location increase
      const destInvRes = await client.query(
        `SELECT * FROM inventory WHERE product_id = $1 AND location_id = $2 FOR UPDATE`,
        [item.product_id, destLocId]
      );

      let destQtyBefore = 0;
      let destQtyAfter = qtyMove;

      if (destInvRes.rows.length > 0) {
        destQtyBefore = parseFloat(destInvRes.rows[0].quantity);
        destQtyAfter = destQtyBefore + qtyMove;
        await client.query(
          `UPDATE inventory SET quantity = $1, updated_at = NOW() WHERE id = $2`,
          [destQtyAfter, destInvRes.rows[0].id]
        );
      } else {
        await client.query(
          `INSERT INTO inventory (product_id, location_id, quantity, updated_at) VALUES ($1, $2, $3, NOW())`,
          [item.product_id, destLocId, destQtyAfter]
        );
      }

      // Destination Ledger Entry (TRANSFER_IN)
      await client.query(
        `INSERT INTO stock_ledger 
         (product_id, location_id, operation_type, reference_type, reference_id, reference_number, quantity_before, quantity_change, quantity_after, performed_by, created_at)
         VALUES ($1, $2, 'TRANSFER_IN', 'TRANSFER', $3, $4, $5, $6, $7, $8, NOW())`,
        [
          item.product_id,
          destLocId,
          transfer.id,
          transfer.transfer_number,
          destQtyBefore,
          qtyMove,
          destQtyAfter,
          userId,
        ]
      );
    }

    // Update Transfer status to Done
    await client.query(
      `UPDATE internal_transfers SET status = 'Done', validated_by = $1, validated_at = NOW(), updated_at = NOW() WHERE id = $2`,
      [userId, transferId]
    );

    await client.query("COMMIT");
    return { success: true, message: `Internal Transfer ${transfer.transfer_number} validated successfully.` };
  } catch (err: any) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function validateAdjustment(adjustmentId: number, userId: number) {
  await initDatabase();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Fetch adjustment
    const adjRes = await client.query(
      `SELECT * FROM inventory_adjustments WHERE id = $1 FOR UPDATE`,
      [adjustmentId]
    );
    if (adjRes.rows.length === 0) {
      throw new Error(`Inventory Adjustment #${adjustmentId} not found`);
    }
    const adjustment = adjRes.rows[0];
    if (adjustment.status === "Done") {
      throw new Error(`Adjustment ${adjustment.adjustment_number} is already validated.`);
    }
    if (adjustment.status === "Canceled") {
      throw new Error(`Adjustment ${adjustment.adjustment_number} is canceled.`);
    }

    // Fetch adjustment items
    const itemsRes = await client.query(
      `SELECT iai.*, p.name as product_name
       FROM inventory_adjustment_items iai
       JOIN products p ON iai.product_id = p.id
       WHERE iai.adjustment_id = $1`,
      [adjustmentId]
    );

    if (itemsRes.rows.length === 0) {
      throw new Error("Cannot validate an adjustment with no items.");
    }

    const locId = adjustment.location_id;

    for (const item of itemsRes.rows) {
      const countedQty = parseFloat(item.counted_quantity);

      // Check current inventory
      const invRes = await client.query(
        `SELECT * FROM inventory WHERE product_id = $1 AND location_id = $2 FOR UPDATE`,
        [item.product_id, locId]
      );

      const previousQty = invRes.rows.length > 0 ? parseFloat(invRes.rows[0].quantity) : 0;
      const difference = countedQty - previousQty;

      // Update item record with calculated difference
      await client.query(
        `UPDATE inventory_adjustment_items 
         SET previous_quantity = $1, difference = $2 
         WHERE id = $3`,
        [previousQty, difference, item.id]
      );

      // Update inventory table
      if (invRes.rows.length > 0) {
        await client.query(
          `UPDATE inventory SET quantity = $1, updated_at = NOW() WHERE id = $2`,
          [countedQty, invRes.rows[0].id]
        );
      } else {
        await client.query(
          `INSERT INTO inventory (product_id, location_id, quantity, updated_at) VALUES ($1, $2, $3, NOW())`,
          [item.product_id, locId, countedQty]
        );
      }

      // Stock Ledger Entry (ADJUSTMENT)
      await client.query(
        `INSERT INTO stock_ledger 
         (product_id, location_id, operation_type, reference_type, reference_id, reference_number, quantity_before, quantity_change, quantity_after, performed_by, created_at)
         VALUES ($1, $2, 'ADJUSTMENT', 'ADJUSTMENT', $3, $4, $5, $6, $7, $8, NOW())`,
        [
          item.product_id,
          locId,
          adjustment.id,
          adjustment.adjustment_number,
          previousQty,
          difference,
          countedQty,
          userId,
        ]
      );
    }

    // Update Adjustment status to Done
    await client.query(
      `UPDATE inventory_adjustments SET status = 'Done', validated_by = $1, validated_at = NOW() WHERE id = $2`,
      [userId, adjustmentId]
    );

    await client.query("COMMIT");
    return { success: true, message: `Inventory Adjustment ${adjustment.adjustment_number} validated successfully.` };
  } catch (err: any) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
