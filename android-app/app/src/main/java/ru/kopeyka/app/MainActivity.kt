package ru.kopeyka.app

import android.app.DatePickerDialog
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import kotlinx.coroutines.launch
import ru.kopeyka.app.data.KopeykaDatabase
import ru.kopeyka.app.data.Transaction
import ru.kopeyka.app.data.TransactionRepository
import ru.kopeyka.app.ui.FinancialMath
import java.time.LocalDate

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val repository = TransactionRepository(KopeykaDatabase.get(this).transactionDao())
        setContent { MaterialTheme { Surface(Modifier.fillMaxSize()) { OfflineHome(repository) } } }
    }
}

@Composable
private fun OfflineHome(repository: TransactionRepository) {
    val rows by repository.transactions.collectAsStateWithLifecycle()
    val scope = rememberCoroutineScope()
    var amountText by remember { mutableStateOf("") }
    var type by remember { mutableStateOf("Расход") }
    var category by remember { mutableStateOf("Другое") }
    var comment by remember { mutableStateOf("") }
    var date by remember { mutableStateOf(LocalDate.now()) }

    val income = FinancialMath.income(rows)
    val expense = FinancialMath.expense(rows)
    val savings = FinancialMath.savings(rows)
    val available = FinancialMath.available(rows)
    val plannedIncome = FinancialMath.plannedIncome(rows)
    val plannedExpense = FinancialMath.plannedExpense(rows)

    Column(
        Modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        Text("Копейка", style = MaterialTheme.typography.headlineLarge)
        Text("Офлайн-режим: данные сохраняются на телефоне", style = MaterialTheme.typography.titleMedium)
        Text("Доход: ${income.formatRub()} ₽")
        Text("Расходы: ${expense.formatRub()} ₽")
        Text("Накопления: ${savings.formatRub()} ₽")
        Text("Доступно сейчас: ${available.formatRub()} ₽", style = MaterialTheme.typography.titleLarge)
        if (plannedIncome > 0 || plannedExpense > 0) {
            Text("Запланировано: +${plannedIncome.formatRub()} ₽ доходов · -${plannedExpense.formatRub()} ₽ расходов")
        }

        OutlinedButton(onClick = { type = "Расход" }) { Text(if (type == "Расход") "✓ Расход" else "Расход") }
        OutlinedButton(onClick = { type = "Доход" }) { Text(if (type == "Доход") "✓ Доход" else "Доход") }
        OutlinedButton(onClick = { type = "Накопление" }) { Text(if (type == "Накопление") "✓ Накопление" else "Накопление") }

        OutlinedTextField(
            value = amountText,
            onValueChange = { amountText = it.filter(Char::isDigit).take(12) },
            label = { Text("Сумма, ₽") },
            modifier = Modifier.fillMaxWidth()
        )
        OutlinedTextField(
            value = category,
            onValueChange = { category = it.take(40) },
            label = { Text("Категория") },
            modifier = Modifier.fillMaxWidth()
        )
        OutlinedTextField(
            value = comment,
            onValueChange = { comment = it.take(200) },
            label = { Text("Комментарий") },
            modifier = Modifier.fillMaxWidth()
        )
        Button(onClick = {
            DatePickerDialog(
                (androidx.compose.ui.platform.LocalContext.current),
                { _, y, m, d -> date = LocalDate.of(y, m + 1, d) },
                date.year, date.monthValue - 1, date.dayOfMonth
            ).show()
        }) { Text("Дата: $date") }

        Button(
            enabled = amountText.toLongOrNull()?.let { it > 0 } == true,
            onClick = {
                val amount = amountText.toLongOrNull() ?: return@Button
                scope.launch { repository.add(date.toString(), type, category.ifBlank { "Другое" }, amount, comment) }
                amountText = ""
                comment = ""
            },
            modifier = Modifier.fillMaxWidth()
        ) { Text("Сохранить локально") }

        LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            items(rows, key = { it.id }) { item -> TransactionCard(item) { scope.launch { repository.delete(item.id) } } }
        }
    }
}

@Composable
private fun TransactionCard(item: Transaction, onDelete: () -> Unit) {
    Card(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text("${item.type}: ${item.amount.formatRub()} ₽", style = MaterialTheme.typography.titleMedium)
            Text("${item.date} · ${item.category}")
            if (item.comment.isNotBlank()) Text(item.comment)
            Text(if (item.syncState == "PENDING") "⟳ Только на телефоне" else "✓ Синхронизировано")
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                OutlinedButton(onClick = onDelete) { Text("Удалить") }
            }
        }
    }
}

private fun Long.formatRub(): String = String.format("%,d", this).replace(',', ' ')
