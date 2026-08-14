package ru.kopeyka.app.data

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "transactions")
data class Transaction(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val date: String,
    val type: String,
    val category: String,
    val amount: Long,
    val comment: String = "",
    val shift: String = "",
    val syncState: String = "PENDING"
)
