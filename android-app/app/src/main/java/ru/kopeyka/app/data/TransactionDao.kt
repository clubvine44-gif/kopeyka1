package ru.kopeyka.app.data

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

@Dao
interface TransactionDao {
    @Query("SELECT * FROM transactions ORDER BY date DESC, id DESC")
    fun observeAll(): Flow<List<Transaction>>

    @Query("SELECT * FROM transactions WHERE syncState = 'PENDING' ORDER BY id")
    suspend fun pending(): List<Transaction>

    @Insert
    suspend fun insert(transaction: Transaction): Long

    @Query("DELETE FROM transactions WHERE id = :id")
    suspend fun delete(id: Long)
}
