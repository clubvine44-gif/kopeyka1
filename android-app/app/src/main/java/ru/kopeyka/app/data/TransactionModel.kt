package ru.kopeyka.app.data

data class TransactionModel(
    val id: Long = 0,
    val date: String,
    val type: String,
    val category: String,
    val amount: Long,
    val comment: String = "",
    val shift: String = ""
)
