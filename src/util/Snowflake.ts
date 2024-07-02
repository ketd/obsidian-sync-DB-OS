export class Snowflake {
	// 工作机器ID(0~1023)
	private readonly workerId: bigint;
	// 数据中心ID(0~1023)
	private readonly dataCenterId: bigint;
	// 序列号(0~4095)
	private sequence: bigint = BigInt(0);

	// 开始时间戳 (2022-01-01)
	private readonly twepoch = BigInt(1640995200000);

	private static readonly workerIdBits = BigInt(5);
	private static readonly dataCenterIdBits = BigInt(5);
	private static readonly maxWorkerId = BigInt(-1) ^ (BigInt(-1) << Snowflake.workerIdBits);
	private static readonly maxDataCenterId = BigInt(-1) ^ (BigInt(-1) << Snowflake.dataCenterIdBits);
	private static readonly sequenceBits = BigInt(12);

	private static readonly workerIdShift = Snowflake.sequenceBits;
	private static readonly dataCenterIdShift = Snowflake.sequenceBits + Snowflake.workerIdBits;
	private static readonly timestampLeftShift = Snowflake.sequenceBits + Snowflake.workerIdBits + Snowflake.dataCenterIdBits;
	private static readonly sequenceMask = BigInt(-1) ^ (BigInt(-1) << Snowflake.sequenceBits);

	private lastTimestamp = BigInt(-1);

	constructor(workerId: bigint, dataCenterId: bigint) {
		if (workerId > Snowflake.maxWorkerId || workerId < BigInt(0)) {
			throw new Error(`worker Id can't be greater than ${Snowflake.maxWorkerId} or less than 0`);
		}
		if (dataCenterId > Snowflake.maxDataCenterId || dataCenterId < BigInt(0)) {
			throw new Error(`data center Id can't be greater than ${Snowflake.maxDataCenterId} or less than 0`);
		}
		this.workerId = workerId;
		this.dataCenterId = dataCenterId;
	}

	public nextId(): bigint {
		let timestamp = this.timeGen();

		if (timestamp < this.lastTimestamp) {
			throw new Error(`Clock moved backwards. Refusing to generate id for ${this.lastTimestamp - timestamp} milliseconds`);
		}

		if (this.lastTimestamp === timestamp) {
			this.sequence = (this.sequence + BigInt(1)) & Snowflake.sequenceMask;
			if (this.sequence === BigInt(0)) {
				timestamp = this.tilNextMillis(this.lastTimestamp);
			}
		} else {
			this.sequence = BigInt(0);
		}

		this.lastTimestamp = timestamp;

		return ((timestamp - this.twepoch) << Snowflake.timestampLeftShift) |
			(this.dataCenterId << Snowflake.dataCenterIdShift) |
			(this.workerId << Snowflake.workerIdShift) |
			this.sequence;
	}

	private timeGen(): bigint {
		return BigInt(Date.now());
	}

	private tilNextMillis(lastTimestamp: bigint): bigint {
		let timestamp = this.timeGen();
		while (timestamp <= lastTimestamp) {
			timestamp = this.timeGen();
		}
		return timestamp;
	}
}
