package ru.kopeyka.app.ui

import ru.kopeyka.app.data.Transaction

object FinancialMath {
    fun income(items: List<Transaction>) = items.filter { it.type == "Доход" }.sumOf { it.amount }
    fun expense(items: List<Transaction>) = items.filter { it.type == "Расход" }.sumOf { it.amount }
    fun savings(items: List<Transaction>) = items.filter { it.type == "Накопление" || (it.type == "Доход" && it.category == "Накопление") }.sumOf { it.amount }
    fun available(items: List<Transaction>) = income(items) - expense(items) - savings(items)
}
