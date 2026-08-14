package ru.kopeyka.app.data

import kotlinx.coroutines.flow.Flow

class TransactionRepository(private val dao: TransactionDao) {
    val transactions: Flow<List<Transaction>> = dao.observeAll()

    suspend fun add(
        date: String,
        type: String,
        category: String,
        amount: Long,
        comment: String = "",
        shift: String = ""
    ) = dao.insert(
        Transaction(
            date = date,
            type = type,
            category = category,
            amount = amount,
            comment = comment,
            shift = shift,
            syncState = "PENDING"
        )
    )

    suspend fun delete(id: Long) = dao.delete(id)
}
