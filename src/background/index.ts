import { BackgroundApp } from './app'

async function bootstrap() {
  const app = new BackgroundApp()
  await app.init()
}

void bootstrap()

