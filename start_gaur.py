#!/usr/bin/env python3
"""
GAUR Enhanced Police Cyber Patrolling System Startup Script
Initializes and starts all Phase 1 core infrastructure services
"""

import asyncio
import logging
import os
import sys
import signal
from pathlib import Path
import psutil
from datetime import datetime

# Add backend to Python path
sys.path.insert(0, str(Path(__file__).parent / "backend"))

from backend.api_gateway.main import app
from backend.api_gateway.database import DatabaseManager
from backend.api_gateway.config import settings
from backend.evidence_manager.main import EvidenceManager
from backend.monitoring.main import SystemMonitor
from backend.batch_processor.main import MemoryEfficientProcessor, create_batch_jobs_table

# AI Service imports (with graceful fallback)
try:
    from backend.ai_service.main import AIService
    from backend.ai_service.config import AIConfig
    HAS_AI_SERVICE = True
except ImportError as e:
    print(f"AI Service not available: {e}")
    print("Install AI dependencies with: pip install -r backend/ai_service/requirements.txt")
    HAS_AI_SERVICE = False
    AIService = None
    AIConfig = None


class GaurSystemManager:
    """GAUR System Manager - orchestrates all services"""

    def __init__(self):
        self.logger = self._setup_logging()
        self.db_manager = DatabaseManager()
        self.system_monitor = None
        self.evidence_manager = None
        self.batch_processor = None
        self.ai_service = None
        self.monitoring_task = None
        self.services_running = False

    def _setup_logging(self):
        """Setup logging configuration"""
        log_dir = Path("logs")
        log_dir.mkdir(exist_ok=True)

        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_dir / "gaur_system.log"),
                logging.StreamHandler(sys.stdout)
            ]
        )
        return logging.getLogger("GaurSystem")

    async def check_system_requirements(self):
        """Check system requirements before starting"""
        self.logger.info("Checking system requirements...")

        # Check memory
        memory = psutil.virtual_memory()
        memory_gb = memory.total / 1024 / 1024 / 1024
        if memory_gb < 7.5:  # Less than 7.5GB total (considering 8GB system)
            self.logger.warning(f"Low system memory detected: {memory_gb:.1f}GB")
        else:
            self.logger.info(f"System memory: {memory_gb:.1f}GB")

        # Check disk space
        disk = psutil.disk_usage('/')
        free_gb = disk.free / 1024 / 1024 / 1024
        if free_gb < 10:
            self.logger.warning(f"Low disk space: {free_gb:.1f}GB free")
        else:
            self.logger.info(f"Disk space: {free_gb:.1f}GB free")

        # Check PostgreSQL
        try:
            import asyncpg
            conn = await asyncpg.connect(settings.DATABASE_URL)
            await conn.fetchval("SELECT 1")
            await conn.close()
            self.logger.info("PostgreSQL connection: OK")
        except Exception as e:
            self.logger.error(f"PostgreSQL connection failed: {e}")
            return False

        # Check Python environment
        import torch
        if torch.backends.mps.is_available():
            self.logger.info("Metal Performance Shaders (MPS) available")
        else:
            self.logger.warning("MPS not available - using CPU only")

        return True

    async def initialize_database(self):
        """Initialize database schema and default data"""
        self.logger.info("Initializing database...")

        await self.db_manager.initialize_pool()
        await self.db_manager.setup_database_schema()

        # Create batch jobs table
        await create_batch_jobs_table(self.db_manager)

        # Create default officer for testing
        await self.db_manager.create_officer_if_not_exists(
            badge_number="TEST001",
            password="testpass123",
            name="Test Officer",
            rank="Inspector",
            department="Cyber Crime"
        )

        # Create system alerts table
        async with self.db_manager.get_connection() as conn:
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS system_alerts (
                    id SERIAL PRIMARY KEY,
                    alert_type VARCHAR(50) NOT NULL,
                    alert_level VARCHAR(20) NOT NULL,
                    message TEXT NOT NULL,
                    metric_value DECIMAL(10, 2),
                    threshold_value DECIMAL(10, 2),
                    created_at TIMESTAMP DEFAULT NOW(),
                    acknowledged BOOLEAN DEFAULT FALSE
                )
            """)

        self.logger.info("Database initialization completed")

    async def initialize_services(self):
        """Initialize all GAUR services"""
        self.logger.info("Initializing GAUR services...")

        # Initialize evidence manager
        self.evidence_manager = EvidenceManager(self.db_manager)
        self.logger.info("Evidence Manager initialized")

        # Initialize system monitor
        self.system_monitor = SystemMonitor(self.db_manager)
        self.logger.info("System Monitor initialized")

        # Initialize AI service (if available)
        if HAS_AI_SERVICE:
            try:
                ai_config = AIConfig.load_from_env()
                self.ai_service = AIService(self.db_manager, ai_config)
                self.logger.info("AI Service initialized successfully")
            except Exception as e:
                self.logger.error(f"Failed to initialize AI Service: {e}")
                self.ai_service = None
        else:
            self.logger.warning("AI Service not available - using keyword-based fallback")

        # Initialize batch processor (with AI service if available)
        self.batch_processor = MemoryEfficientProcessor(self.db_manager, self.ai_service)
        self.logger.info("Batch Processor initialized")

        self.logger.info("All services initialized successfully")

    async def start_background_tasks(self):
        """Start background monitoring tasks"""
        self.logger.info("Starting background monitoring...")

        # Start system monitoring
        self.monitoring_task = asyncio.create_task(
            self.system_monitor.start_monitoring(interval_seconds=60)
        )

        self.logger.info("Background tasks started")

    def setup_signal_handlers(self):
        """Setup graceful shutdown signal handlers"""
        def signal_handler(signum, frame):
            self.logger.info(f"Received signal {signum}, initiating shutdown...")
            asyncio.create_task(self.shutdown())

        signal.signal(signal.SIGINT, signal_handler)
        signal.signal(signal.SIGTERM, signal_handler)

    async def start_api_gateway(self):
        """Start the API Gateway server"""
        import uvicorn
        from uvicorn.config import Config

        config = Config(
            app="backend.api_gateway.main:app",
            host="0.0.0.0",
            port=8000,
            reload=False,
            log_level="info"
        )

        server = uvicorn.Server(config)
        self.logger.info("Starting API Gateway on http://0.0.0.0:8000")

        # Start server in background task
        server_task = asyncio.create_task(server.serve())
        self.services_running = True

        return server_task

    async def health_check(self):
        """Perform system health check"""
        self.logger.info("Performing health check...")

        health_status = await self.system_monitor.get_system_health()

        self.logger.info(f"System Status: {health_status['status']}")
        self.logger.info(f"Memory Usage: {health_status['current_metrics']['memory_used_mb']:.1f}MB")
        self.logger.info(f"CPU Usage: {health_status['current_metrics']['cpu_percent']:.1f}%")

        # Check database stats
        db_stats = await self.db_manager.get_database_stats()
        self.logger.info(f"Database - Content: {db_stats.get('scraped_content_count', 0)} items")
        self.logger.info(f"Database - Alerts: {db_stats.get('fraud_alerts_count', 0)} alerts")
        self.logger.info(f"Database - Evidence: {db_stats.get('evidence_count', 0)} records")

        # AI Service status
        if self.ai_service:
            try:
                ai_stats = await self.ai_service.get_processing_stats()
                self.logger.info(f"AI Service - Processed: {ai_stats.get('total_processed', 0)} items")
                self.logger.info(f"AI Service - Fraud detected: {ai_stats.get('fraud_detected', 0)} cases")
                health_status['ai_service'] = 'operational'
            except Exception as e:
                self.logger.warning(f"AI Service health check failed: {e}")
                health_status['ai_service'] = 'degraded'
        else:
            health_status['ai_service'] = 'not_available'

        return health_status

    async def shutdown(self):
        """Graceful shutdown of all services"""
        self.logger.info("Starting graceful shutdown...")

        self.services_running = False

        # Cancel monitoring task
        if self.monitoring_task:
            self.monitoring_task.cancel()
            try:
                await self.monitoring_task
            except asyncio.CancelledError:
                pass

        # Cleanup AI service
        if self.ai_service:
            try:
                await self.ai_service.cleanup_resources()
                self.logger.info("AI Service cleaned up")
            except Exception as e:
                self.logger.error(f"AI Service cleanup failed: {e}")

        # Close database connections
        if self.db_manager:
            await self.db_manager.close_pool()

        self.logger.info("Shutdown completed")

    async def run(self):
        """Main run method"""
        try:
            self.logger.info("=" * 60)
            self.logger.info("GAUR Enhanced Police Cyber Patrolling System")
            self.logger.info("Phase 1: Core Infrastructure")
            self.logger.info("=" * 60)

            # Setup signal handlers
            self.setup_signal_handlers()

            # Check system requirements
            if not await self.check_system_requirements():
                self.logger.error("System requirements check failed")
                return 1

            # Initialize database
            await self.initialize_database()

            # Initialize services
            await self.initialize_services()

            # Start background tasks
            await self.start_background_tasks()

            # Perform initial health check
            await self.health_check()

            # Start API Gateway
            server_task = await self.start_api_gateway()

            self.logger.info("=" * 60)
            self.logger.info("GAUR System is now running!")
            self.logger.info("API Gateway: http://localhost:8000")
            self.logger.info("API Documentation: http://localhost:8000/docs")
            self.logger.info("System Health: http://localhost:8000/health")
            self.logger.info("=" * 60)
            self.logger.info("Press Ctrl+C to shutdown")

            # Wait for server
            await server_task

        except KeyboardInterrupt:
            self.logger.info("Keyboard interrupt received")
        except Exception as e:
            self.logger.error(f"System error: {e}")
            return 1
        finally:
            await self.shutdown()

        return 0


def main():
    """Main entry point"""
    # Create necessary directories
    for directory in ["logs", "evidence", "exports"]:
        Path(directory).mkdir(exist_ok=True)

    # Create .env file from example if it doesn't exist
    env_file = Path(".env")
    env_example = Path(".env.example")
    if not env_file.exists() and env_example.exists():
        env_file.write_text(env_example.read_text())
        print(f"Created .env file from .env.example")
        print("Please edit .env with your configuration before running again")
        return 1

    # Run the system
    system_manager = GaurSystemManager()
    return asyncio.run(system_manager.run())


if __name__ == "__main__":
    sys.exit(main())