import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { HealthController } from './health.controller';
import { InvoicesModule } from './invoices/invoices.module';
import { RoomsModule } from './rooms/rooms.module';
import { TenantsModule } from './tenants/tenants.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const common = {
          type: 'postgres' as const,
          autoLoadEntities: true,
          // Auto-creating/altering tables can destroy data, so it is OFF by default.
          // Set DB_SYNCHRONIZE=true only for a first run against an empty database
          // (and always in local development). Proper migrations are the long-term fix.
          synchronize: config.get<string>('DB_SYNCHRONIZE', 'false') === 'true',
        };

        // Hosted databases (e.g. Neon) give a single connection string and require SSL.
        const url = config.get<string>('DATABASE_URL');
        if (url) {
          return { ...common, url, ssl: true };
        }

        // Local development: separate variables, no SSL.
        return {
          ...common,
          host: config.get<string>('DB_HOST', 'localhost'),
          port: Number(config.get('DB_PORT', 5432)),
          username: config.get<string>('DB_USER'),
          password: config.get<string>('DB_PASSWORD'),
          database: config.get<string>('DB_NAME'),
        };
      },
    }),
    AuthModule,
    UsersModule,
    RoomsModule,
    TenantsModule,
    InvoicesModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
