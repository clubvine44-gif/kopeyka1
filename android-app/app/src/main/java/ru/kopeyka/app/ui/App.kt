package ru.kopeyka.app.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import ru.kopeyka.app.data.Transaction

@Composable
fun KopeykaApp(items: List<Transaction>, onAdd: (Long) -> Unit) {
    val available = FinancialMath.available(items)
    var amount by remember { mutableStateOf(0L) }
    Column(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("Копейка", style = MaterialTheme.typography.headlineMedium)
        Text("Доступно: ${available} ₽", style = MaterialTheme.typography.titleLarge)
        Button(onClick = { amount = 100; onAdd(amount) }) { Text("Добавить тестовую операцию 100 ₽") }
        LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            items(items, key = { it.id }) { item ->
                Card { Column(Modifier.padding(12.dp)) {
                    Text("${item.category}: ${item.amount} ₽")
                    Text("${item.date} · ${item.type}")
                }}
            }
        }
    }
}
