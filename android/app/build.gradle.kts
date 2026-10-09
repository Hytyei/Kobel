import java.util.Properties

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
}

// Optional release signing. Create android/keystore.properties (git-ignored), see docs/DEPLOYMENT.md step 8.
val keystoreProps = Properties().apply {
    val f = rootProject.file("keystore.properties")
    if (f.exists()) f.inputStream().use { load(it) }
}

android {
    namespace = "app.kobel"
    compileSdk = 35

    defaultConfig {
        applicationId = "app.kobel.german"
        minSdk = 26            // Android 8.0 and newer
        targetSdk = 35
        // CI (and you) can override these:  ./gradlew assembleRelease -PversionCode=5 -PversionName=1.2.0
        versionCode = (project.findProperty("versionCode") as String?)?.toInt() ?: 210
        versionName = (project.findProperty("versionName") as String?) ?: "2.10"
        // The GitHub repo that hosts your releases, e.g. "hadi/kobel". Set it in android/gradle.properties.
        buildConfigField("String", "GITHUB_REPO", "\"${project.findProperty("kobelRepo") ?: "YOUR_GITHUB_USER/kobel"}\"")
    }

    signingConfigs {
        if (keystoreProps.containsKey("storeFile")) {
            create("release") {
                storeFile = rootProject.file(keystoreProps.getProperty("storeFile"))
                storePassword = keystoreProps.getProperty("storePassword")
                keyAlias = keystoreProps.getProperty("keyAlias")
                keyPassword = keystoreProps.getProperty("keyPassword")
            }
        }
    }

    buildTypes {
        debug {
            applicationIdSuffix = ".debug"   // lets the debug build live next to the release build
        }
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            if (keystoreProps.containsKey("storeFile")) signingConfig = signingConfigs.getByName("release")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }

    buildFeatures {
        compose = true
        buildConfig = true
    }
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.activity.compose)
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.foundation)
    implementation(libs.androidx.webkit)
}
