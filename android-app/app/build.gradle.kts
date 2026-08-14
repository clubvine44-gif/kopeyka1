plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
    id("com.google.devtools.ksp")
}

android {
    namespace = "ru.kopeyka.app"
    compileSdk = 35
    defaultConfig {
        applicationId = "ru.kopeyka.app"
        minSdk = 26
        targetSdk = 35
        versionCode = 3
        versionName = "1.2.0"
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
    buildFeatures { compose = true }

    sourceSets["main"].assets.srcDir(layout.buildDirectory.dir("generated/kopeykaWeb"))
}

val prepareKopeykaWeb = tasks.register<Copy>("prepareKopeykaWeb") {
    val repoRoot = rootProject.projectDir.parentFile
    from(repoRoot) {
        include("index.html", "app.js", "manifest.json", "sw.js", "icon-192.png")
    }
    into(layout.buildDirectory.dir("generated/kopeykaWeb"))
}

tasks.named("preBuild") {
    dependsOn(prepareKopeykaWeb)
}

dependencies {
    val composeBom = platform("androidx.compose:compose-bom:2025.02.00")
    implementation(composeBom)
    androidTestImplementation(composeBom)
    implementation("androidx.activity:activity-compose:1.10.1")
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.ui:ui-tooling-preview")
    debugImplementation("androidx.compose.ui:ui-tooling")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.8.7")
    implementation("androidx.room:room-runtime:2.7.0")
    implementation("androidx.room:room-ktx:2.7.0")
    ksp("androidx.room:room-compiler:2.7.0")
    implementation("androidx.work:work-runtime-ktx:2.10.1")
    implementation("androidx.webkit:webkit:1.12.1")
}
