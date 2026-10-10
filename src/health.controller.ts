import { Controller, Get } from '@nestjs/common';

// Public endpoint for hosting platforms and uptime checks. Exposes no data.
@Controller('health')
export class HealthController {
  @Get()
  check() {
    return { status: 'ok' };
  }
}
