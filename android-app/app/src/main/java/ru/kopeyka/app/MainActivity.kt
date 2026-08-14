package ru.kopeyka.app

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
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import kotlinx.coroutines.launch
import androidx.lifecycle.lifecycleScope
import ru.kopeyka.app.data.KopeykaDatabase
import ru.kopeyka.app.data.TransactionRepository

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val repository = TransactionRepository(KopeykaDatabase.get(this).transactionDao())
        setContent {
            MaterialTheme { Surface(Modifier.fillMaxSize()) { OfflineHome(repository) } }
        }
    }
}

@Composable
private fun OfflineHome(repository: TransactionRepository) {
    val rows by repository.transactions.collectAsStateWithLifecycle()
    var amountText by remember { mutableStateOf("") }
    var type by remember { mutableStateOf("Расход") }

    val income = rows.filter { it.type == "Доход" }.sumOf { it.amount }
    val expense = rows.filter { it.type == "Расход" }.sumOf { it.amount }
    val savings = rows.filter { it.type == "Накопление" || (it.type == "Доход" && it.category == "Накопление") }.sumOf { it.amount }
    val available = income - expense - savings

    Column(
        Modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text("Копейка", style = MaterialTheme.typography.headlineLarge)
        Text("Работает без интернета", style = MaterialTheme.typography.titleMedium)
        Text("Доход: $income ₽")
        Text("Расходы: $expense ₽")
        Text("Накопления: $savings ₽")
        Text("Доступно: $available ₽", style = MaterialTheme.typography.titleLarge)

        OutlinedTextField(
            value = amountText,
            onValueChange = { amountText = it.filter(Char::isDigit) },
            label = { Text("Сумма, ₽") },
            modifier = Modifier.fillMaxWidth()
        )

        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Button(onClick = { type = "Расход" }) { Text("Расход") }
            Button(onClick = { type = "Доход" }) { Text("Доход") }
            Button(onClick = {
                val amount = amountText.toLongOrNull()
                if (amount != null && amount > 0) {
                    val today = java.time.LocalDate.now().toString()
                    // Repository writes to Room immediately; no network is required.
                    kotlinx.coroutines.GlobalScope.launch {
                        repository.add(today, type, "Другое", amount)
                    }
                    amountText = ""
                }
            }) { Text("Добавить") }
        }

        LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            items(rows, key = { it.id }) { item ->
                Card(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(12.dp)) {
                        Text("${item.type}: ${item.amount} ₽")
                        Text("${item.date} · ${item.category}")
                    }
                }
            }
        }
    }
}
