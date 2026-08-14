package ru.kopeyka.app.data

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase

@Database(entities = [Transaction::class], version = 1, exportSchema = false)
abstract class KopeykaDatabase : RoomDatabase() {
    abstract fun transactionDao(): TransactionDao

    companion object {
        @Volatile private var instance: KopeykaDatabase? = null
        fun get(context: Context): KopeykaDatabase = instance ?: synchronized(this) {
            instance ?: Room.databaseBuilder(context.applicationContext, KopeykaDatabase::class.java, "kopeyka.db").build().also { instance = it }
        }
    }
}
