#!/usr/bin/env bash
# Renders the widgets to PNG on a normal computer. Needs a JDK and a Kotlin compiler jar set (the one inside Gradle works).
#   ./build.sh <out dir> [fonts dir]
set -e
here="$(cd "$(dirname "$0")" && pwd)"
G="${GRADLE_LIB:-/opt/gradle-8.14.3/lib}"
CP="$G/kotlin-compiler-embeddable-2.0.21.jar:$G/kotlin-stdlib-2.0.21.jar:$G/kotlin-script-runtime-2.0.21.jar:$G/kotlin-reflect-2.0.21.jar:$G/kotlin-daemon-embeddable-2.0.21.jar:$(ls $G/trove4j*.jar $G/annotations-*.jar $G/kotlinx-coroutines-core-jvm-*.jar 2>/dev/null | tr '\n' ':')"
tmp="$(mktemp -d)"
java -cp "$CP" org.jetbrains.kotlin.cli.jvm.K2JVMCompiler -no-stdlib -cp "$G/kotlin-stdlib-2.0.21.jar" -d "$tmp" \
  "$here/src/AndroidGraphicsStubs.kt" "$here/src/Preview.kt" "$here/../../app/src/main/java/app/kobel/WidgetArt.kt" 2>&1 | grep -v "^warning" || true
java -cp "$tmp:$G/kotlin-stdlib-2.0.21.jar" PreviewKt "$@"
