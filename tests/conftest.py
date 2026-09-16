"""Session-wide pytest fixtures.

Tier 4 introduced two process-wide, in-memory singletons --
api.routes.predict.predict_rate_limiter and
api.routes.analytics.analytics_cache -- that persist for the life of the
Python process, independent of any single test's own isolated database
(see test_api.py's `client` fixture docstring for how DB isolation
already works). Without a reset, one test tripping the rate limiter
would leave OTHER tests' /predict calls rejected for up to a minute of
real wall-clock time, and a cached /analytics response from one test's
database could leak into another test's assertions within the cache's
TTL window. Both are real cross-test coupling bugs, not hypothetical --
this fixture is what prevents them, for every test file, without each
one needing its own copy of this logic.
"""

from __future__ import annotations

import pytest

from api.routes.analytics import analytics_cache
from api.routes.predict import predict_rate_limiter
from api.routes.simulate import simulate_transactions_rate_limiter


@pytest.fixture(autouse=True)
def _reset_stateful_singletons():
    predict_rate_limiter.reset()
    analytics_cache.invalidate()
    simulate_transactions_rate_limiter.reset()
    yield
    predict_rate_limiter.reset()
    analytics_cache.invalidate()
    simulate_transactions_rate_limiter.reset()
