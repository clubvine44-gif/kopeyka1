package ru.kopeyka.app.ui

import ru.kopeyka.app.data.Transaction
import java.time.LocalDate

object FinancialMath {
    private fun actual(items: List<Transaction>, today: LocalDate = LocalDate.now()) =
        items.filter { runCatching { LocalDate.parse(it.date) }.getOrNull()?.let { date -> !date.isAfter(today) } == true }

    fun income(items: List<Transaction>, today: LocalDate = LocalDate.now()) =
        actual(items, today).filter { it.type == "Доход" && it.category != "Накопление" }.sumOf { it.amount }

    fun expense(items: List<Transaction>, today: LocalDate = LocalDate.now()) =
        actual(items, today).filter { it.type == "Расход" }.sumOf { it.amount }

    fun savings(items: List<Transaction>, today: LocalDate = LocalDate.now()) =
        actual(items, today).filter { it.type == "Накопление" || (it.type == "Доход" && it.category == "Накопление") }.sumOf { it.amount }

    fun available(items: List<Transaction>, today: LocalDate = LocalDate.now()) =
        income(items, today) - expense(items, today) - savings(items, today)

    fun plannedIncome(items: List<Transaction>, today: LocalDate = LocalDate.now()) =
        items.filter { it.type == "Доход" && runCatching { LocalDate.parse(it.date) }.getOrNull()?.isAfter(today) == true }.sumOf { it.amount }

    fun plannedExpense(items: List<Transaction>, today: LocalDate = LocalDate.now()) =
        items.filter { it.type == "Расход" && runCatching { LocalDate.parse(it.date) }.getOrNull()?.isAfter(today) == true }.sumOf { it.amount }
}
