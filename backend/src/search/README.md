# Advanced Search and AI-Powered Features

This module implements comprehensive search functionality for the AI-native ATS, including full-text search with Elasticsearch and semantic search with AI integration.

## Features

### 1. Full-Text Search with Elasticsearch

- **Multi-index search**: Search across candidates, jobs, applications, and notes
- **Advanced filtering**: Skills, experience, location, date ranges, and more
- **Faceted search**: Get aggregated results for better filtering
- **Relevance scoring**: Elasticsearch's built-in relevance algorithms
- **Highlighting**: Search term highlighting in results
- **Suggestions**: Auto-complete and query suggestions
- **Analytics**: Search behavior tracking and optimization

### 2. Semantic Search with AI Integration

- **Vector embeddings**: Uses OpenAI's text-embedding-3-large model
- **Semantic similarity**: Find conceptually similar content, not just keyword matches
- **Candidate recommendations**: AI-powered candidate matching for job requirements
- **Skill suggestions**: Career development recommendations based on market analysis
- **Query expansion**: AI-generated related search terms
- **Machine learning ranking**: Personalized result ranking based on user behavior

### 3. Saved Searches

- **Personal searches**: Save and reuse complex search queries
- **Shared searches**: Collaborate with team members
- **Usage tracking**: Monitor search popularity and effectiveness
- **Search templates**: Quick access to common search patterns

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Controllers   │    │    Services     │    │   Data Layer    │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ SearchController│───▶│ SearchService   │───▶│ Elasticsearch   │
│ SemanticSearch  │    │ IndexingService │    │ PostgreSQL      │
│ Controller      │    │ SavedSearch     │    │ OpenAI API      │
└─────────────────┘    │ Service         │    └─────────────────┘
                       │ SemanticSearch  │
                       │ Service         │
                       └─────────────────┘
```

## Setup

### 1. Install Dependencies

```bash
npm install @elastic/elasticsearch @nestjs/elasticsearch @nestjs/event-emitter
```

### 2. Start Elasticsearch

Using Docker Compose:

```bash
docker-compose -f docker-compose.elasticsearch.yml up -d
```

### 3. Environment Variables

Add to your `.env` file:

```env
ELASTICSEARCH_NODE=http://localhost:9200
ELASTICSEARCH_USERNAME=elastic
ELASTICSEARCH_PASSWORD=changeme
OPENAI_API_KEY=your_openai_api_key
```

### 4. Database Migration

Run the search functionality migration:

```bash
npm run migration:run
```

## API Endpoints

### Full-Text Search

```http
POST /search
Content-Type: application/json

{
  "query": "JavaScript developer",
  "type": "candidates",
  "filters": {
    "skills": ["JavaScript", "React"],
    "experience": { "min": 2, "max": 5 },
    "location": ["New York", "Remote"]
  },
  "facets": ["skills", "location", "experience"],
  "page": 1,
  "limit": 20
}
```

### Semantic Search

```http
POST /search/semantic
Content-Type: application/json

{
  "query": "experienced frontend engineer",
  "type": "candidates",
  "threshold": 0.7,
  "includeExplanation": true
}
```

### Candidate Recommendations

```http
POST /search/semantic/recommendations/candidates
Content-Type: application/json

{
  "jobRequirements": [
    "React development",
    "TypeScript experience",
    "API integration",
    "Testing frameworks"
  ],
  "limit": 10
}
```

### Skill Suggestions

```http
POST /search/semantic/suggestions/skills
Content-Type: application/json

{
  "currentSkills": ["JavaScript", "HTML", "CSS"],
  "targetRole": "Senior Frontend Developer"
}
```

### Saved Searches

```http
# Create saved search
POST /search/saved
{
  "name": "Senior JavaScript Developers",
  "query": "JavaScript developer",
  "filters": { "experience": { "min": 5 } },
  "searchType": "candidates"
}

# Execute saved search
POST /search/saved/{id}/execute

# Share saved search
POST /search/saved/{id}/share
{
  "userIds": ["user-1", "user-2"]
}
```

## Data Indexing

The system automatically indexes data when entities are created, updated, or deleted using event listeners:

```typescript
// Automatic indexing on entity changes
@OnEvent('candidate.created')
async handleCandidateCreated(candidate: Candidate) {
  await this.indexingService.indexCandidate(candidate);
}
```

### Manual Reindexing

```typescript
// Reindex all data
await indexingService.reindexAll();

// Reindex for specific tenant
await indexingService.reindexAll('tenant-id');
```

## Search Analytics

Track search behavior and optimize results:

```http
GET /search/analytics
```

Returns:

- Popular search queries
- Search result click-through rates
- User search patterns
- Performance metrics

## Performance Optimization

### Elasticsearch Configuration

- **Sharding**: Single shard for small datasets, multiple shards for large ones
- **Replicas**: 0 replicas for development, 1+ for production
- **Refresh interval**: Optimized for search vs. indexing performance
- **Memory allocation**: Proper heap size configuration

### Caching Strategy

- **Query result caching**: Cache frequent searches
- **Embedding caching**: Cache OpenAI embeddings to reduce API calls
- **Aggregation caching**: Cache facet results

### Monitoring

- **Search latency**: Track response times
- **Index size**: Monitor storage usage
- **API usage**: Track OpenAI API consumption
- **Error rates**: Monitor failed searches

## Testing

### Unit Tests

```bash
npm test search
```

### Integration Tests

```bash
npm run test:e2e search
```

### Performance Tests

```bash
# Load test with sample data
npm run test:performance search
```

## Troubleshooting

### Common Issues

1. **Elasticsearch connection failed**
   - Check if Elasticsearch is running
   - Verify connection settings in environment variables
   - Check network connectivity

2. **OpenAI API errors**
   - Verify API key is valid
   - Check rate limits and quotas
   - Monitor API usage

3. **Slow search performance**
   - Check Elasticsearch cluster health
   - Optimize query structure
   - Review index mappings
   - Consider caching strategies

4. **Indexing failures**
   - Check Elasticsearch disk space
   - Verify data format and mappings
   - Review error logs

### Debug Mode

Enable debug logging:

```env
LOG_LEVEL=debug
```

### Health Checks

```http
GET /health/elasticsearch
GET /health/search
```

## Future Enhancements

1. **Advanced ML Features**
   - Custom ranking models
   - Personalization algorithms
   - A/B testing for search results

2. **Multi-language Support**
   - Language detection
   - Cross-language search
   - Localized relevance scoring

3. **Real-time Features**
   - Live search suggestions
   - Real-time result updates
   - Collaborative filtering

4. **Advanced Analytics**
   - Search result quality metrics
   - User satisfaction tracking
   - Conversion rate optimization
