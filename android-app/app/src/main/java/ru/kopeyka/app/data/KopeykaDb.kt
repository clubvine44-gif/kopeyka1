package ru.kopeyka.app.data

import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper

class KopeykaDb(context: Context) : SQLiteOpenHelper(context, "kopeyka.db", null, 1) {
    override fun onCreate(db: SQLiteDatabase) {
        db.execSQL("CREATE TABLE transactions (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT NOT NULL, type TEXT NOT NULL, category TEXT NOT NULL, amount INTEGER NOT NULL, comment TEXT NOT NULL DEFAULT '', shift TEXT NOT NULL DEFAULT '', sync_state TEXT NOT NULL DEFAULT 'PENDING')")
        db.execSQL("CREATE INDEX idx_transactions_date ON transactions(date)")
        db.execSQL("CREATE INDEX idx_transactions_sync ON transactions(sync_state)")
    }
    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {}

    fun add(t: TransactionModel): Long = writableDatabase.insertOrThrow("transactions", null, android.content.ContentValues().apply {
        put("date", t.date); put("type", t.type); put("category", t.category); put("amount", t.amount); put("comment", t.comment); put("shift", t.shift); put("sync_state", "PENDING")
    })
}
